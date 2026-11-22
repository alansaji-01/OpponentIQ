from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Sum, Count, Q
from django.shortcuts import get_object_or_404
from .models import Team, Player
from .serializers import TeamSerializer, PlayerSerializer
from apps.matches.models import Match, MatchTeam, MatchEvent

class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all().prefetch_related('players')
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        is_demo = self.request.query_params.get('is_demo')
        if is_demo is not None:
            qs = qs.filter(is_demo_data=is_demo.lower() in ('true', '1'))
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(short_code__icontains=search))
        return qs

    @action(detail=False, methods=['get'], url_path='compare')
    def compare(self, request):
        team_a_id = request.query_params.get('team_a')
        team_b_id = request.query_params.get('team_b')

        if not team_a_id or not team_b_id:
            return Response(
                {"error": "Both team_a and team_b query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        team_a = get_object_or_404(Team, pk=team_a_id)
        team_b = get_object_or_404(Team, pk=team_b_id)

        # Head to head matches between these two
        h2h_matches = Match.objects.filter(
            (Q(home_team=team_a) & Q(away_team=team_b)) |
            (Q(home_team=team_b) & Q(away_team=team_a))
        ).order_by('-match_date')

        # Real aggregate query from MatchTeam
        def get_team_aggregates(team):
            mts = MatchTeam.objects.filter(team=team)
            total_matches = mts.count()
            if total_matches == 0:
                return {
                    "matches_played": 0,
                    "avg_possession": 0.0,
                    "avg_ppda": 0.0,
                    "total_shots": 0,
                    "total_shots_on_target": 0,
                    "total_passes_attempted": 0,
                    "total_passes_completed": 0,
                    "pass_accuracy_pct": 0.0,
                    "total_tackles": 0,
                    "total_interceptions": 0,
                    "total_fouls": 0
                }
            aggs = mts.aggregate(
                avg_possession=Avg('possession_pct'),
                avg_ppda=Avg('ppda'),
                total_shots=Sum('shots'),
                total_shots_on_target=Sum('shots_on_target'),
                total_passes_attempted=Sum('passes_attempted'),
                total_passes_completed=Sum('passes_completed'),
                total_tackles=Sum('tackles'),
                total_interceptions=Sum('interceptions'),
                total_fouls=Sum('fouls')
            )
            passes_att = aggs['total_passes_attempted'] or 0
            passes_comp = aggs['total_passes_completed'] or 0
            pass_acc = round((passes_comp / passes_att * 100), 2) if passes_att > 0 else 0.0

            return {
                "matches_played": total_matches,
                "avg_possession": round(float(aggs['avg_possession'] or 0), 2),
                "avg_ppda": round(float(aggs['avg_ppda'] or 0), 2),
                "total_shots": aggs['total_shots'] or 0,
                "total_shots_on_target": aggs['total_shots_on_target'] or 0,
                "total_passes_attempted": passes_att,
                "total_passes_completed": passes_comp,
                "pass_accuracy_pct": pass_acc,
                "total_tackles": aggs['total_tackles'] or 0,
                "total_interceptions": aggs['total_interceptions'] or 0,
                "total_fouls": aggs['total_fouls'] or 0
            }

        h2h_list = []
        team_a_wins = 0
        team_b_wins = 0
        draws = 0

        for m in h2h_matches:
            if m.status == Match.Status.COMPLETED:
                if m.home_team == team_a:
                    if m.home_score > m.away_score:
                        team_a_wins += 1
                    elif m.home_score < m.away_score:
                        team_b_wins += 1
                    else:
                        draws += 1
                else:
                    if m.away_score > m.home_score:
                        team_a_wins += 1
                    elif m.away_score < m.home_score:
                        team_b_wins += 1
                    else:
                        draws += 1

            h2h_list.append({
                "id": m.id,
                "date": m.match_date.strftime('%Y-%m-%d'),
                "competition": m.competition,
                "home_team": m.home_team.name,
                "away_team": m.away_team.name,
                "home_score": m.home_score,
                "away_score": m.away_score,
                "status": m.status,
                "is_demo_data": m.is_demo_data
            })

        data = {
            "team_a": TeamSerializer(team_a).data,
            "team_b": TeamSerializer(team_b).data,
            "h2h_summary": {
                "total_meetings": len(h2h_matches),
                "team_a_wins": team_a_wins,
                "team_b_wins": team_b_wins,
                "draws": draws,
            },
            "h2h_matches": h2h_list,
            "stats": {
                "team_a": get_team_aggregates(team_a),
                "team_b": get_team_aggregates(team_b),
            }
        }
        return Response(data)

class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all().select_related('team')
    serializer_class = PlayerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        team_id = self.request.query_params.get('team')
        if team_id:
            qs = qs.filter(team_id=team_id)
        pos = self.request.query_params.get('position')
        if pos:
            qs = qs.filter(primary_position=pos)
        return qs
