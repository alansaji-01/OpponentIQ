import math
from decimal import Decimal
from django.db.models import Count, Avg, Sum, Q, F
from apps.matches.models import Match, MatchEvent, MatchTeam
from apps.teams.models import Team, Player

class AnalyticsEngine:
    """
    Deterministic Statistical Football Analytics Engine.
    Strict Rule 3: Zero Fake Data. All KPIs, metrics, distributions, and aggregates
    are mathematically derived from real PostgreSQL database records.
    """

    @classmethod
    def get_overview_dashboard_kpis(cls):
        """Calculates global dataset KPIs and live breakdown distributions."""
        total_teams = Team.objects.count()
        total_players = Player.objects.count()
        total_matches = Match.objects.count()
        total_events = MatchEvent.objects.count()

        # Shot Metrics & xG
        shot_events = MatchEvent.objects.filter(event_type=MatchEvent.EventType.SHOT)
        total_shots = shot_events.count()
        total_goals = shot_events.filter(outcome=MatchEvent.Outcome.GOAL).count()
        total_xg = shot_events.aggregate(sum_xg=Sum('xg_value'))['sum_xg'] or Decimal('0.0')

        shot_conversion_pct = round((total_goals / total_shots * 100), 1) if total_shots > 0 else 0.0

        # Pass Metrics & Progressive Passes
        # In football analytics, a pass is "Progressive" if it moves the ball at least 25% closer to opponent goal line
        pass_events = MatchEvent.objects.filter(event_type=MatchEvent.EventType.PASS)
        total_passes = pass_events.count()
        completed_passes = pass_events.filter(outcome=MatchEvent.Outcome.SUCCESS).count()
        pass_accuracy_pct = round((completed_passes / total_passes * 100), 1) if total_passes > 0 else 0.0

        # High-defensive actions
        defensive_events = MatchEvent.objects.filter(
            event_type__in=[MatchEvent.EventType.TACKLE, MatchEvent.EventType.INTERCEPTION]
        )
        total_defensive_actions = defensive_events.count()
        # High-turnover regains (in final 40% of pitch, start_x >= 60)
        high_press_regains = defensive_events.filter(start_x__gte=60.0, outcome=MatchEvent.Outcome.SUCCESS).count()

        # Event distribution by type for live chart
        event_breakdown = list(
            MatchEvent.objects.values('event_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Recent 5 Matches
        recent_matches = []
        for m in Match.objects.select_related('home_team', 'away_team').order_by('-match_date')[:5]:
            recent_matches.append({
                "id": m.id,
                "date": m.match_date.strftime('%Y-%m-%d'),
                "competition": m.competition,
                "home_team": m.home_team.name,
                "home_code": m.home_team.short_code,
                "home_color": m.home_team.primary_color,
                "away_team": m.away_team.name,
                "away_code": m.away_team.short_code,
                "away_color": m.away_team.primary_color,
                "score": f"{m.home_score} - {m.away_score}",
                "event_count": m.events.count(),
                "is_demo_data": m.is_demo_data,
            })

        # Top Performing Clubs
        club_standings = []
        for t in Team.objects.all():
            m_teams = MatchTeam.objects.filter(team=t)
            m_count = m_teams.count()
            if m_count > 0:
                aggs = m_teams.aggregate(
                    avg_poss=Avg('possession_pct'),
                    avg_ppda=Avg('ppda'),
                    sum_shots=Sum('shots'),
                    sum_tackles=Sum('tackles')
                )
                club_standings.append({
                    "id": t.id,
                    "name": t.name,
                    "code": t.short_code,
                    "color": t.primary_color,
                    "formation": t.default_formation,
                    "pressing_style": t.pressing_style,
                    "matches_played": m_count,
                    "avg_possession": round(float(aggs['avg_poss'] or 0), 1),
                    "avg_ppda": round(float(aggs['avg_ppda'] or 0), 1),
                    "total_shots": aggs['sum_shots'] or 0,
                    "total_tackles": aggs['sum_tackles'] or 0,
                })
        club_standings.sort(key=lambda x: x['avg_possession'], reverse=True)

        return {
            "summary_kpis": {
                "total_teams": total_teams,
                "total_players": total_players,
                "total_matches": total_matches,
                "total_events": total_events,
                "total_shots": total_shots,
                "total_goals": total_goals,
                "total_xg": round(float(total_xg), 2),
                "shot_conversion_pct": shot_conversion_pct,
                "total_passes": total_passes,
                "pass_accuracy_pct": pass_accuracy_pct,
                "total_defensive_actions": total_defensive_actions,
                "high_press_regains": high_press_regains
            },
            "event_breakdown": event_breakdown,
            "club_standings": club_standings,
            "recent_matches": recent_matches
        }

    @classmethod
    def get_player_analytics_dataset(cls, team_id=None, position=None):
        """
        Derives granular deterministic player metrics:
        - Passing efficiency, pass volume, progressive passes
        - Shot volume, goals, xG, conversion %
        - Defensive actions, pressure involvement
        """
        players_qs = Player.objects.all().select_related('team')
        if team_id:
            players_qs = players_qs.filter(team_id=team_id)
        if position:
            players_qs = players_qs.filter(primary_position=position)

        results = []
        for p in players_qs:
            # Player Events
            p_events = MatchEvent.objects.filter(player=p)
            total_evs = p_events.count()

            # Pass metrics
            p_passes = p_events.filter(event_type=MatchEvent.EventType.PASS)
            pass_att = p_passes.count()
            pass_comp = p_passes.filter(outcome=MatchEvent.Outcome.SUCCESS).count()
            pass_acc = round((pass_comp / pass_att * 100), 1) if pass_att > 0 else 0.0

            # Progressive passes calculation
            # Distance moved forwards towards target: (end_x - start_x) >= 15
            prog_passes = p_passes.filter(
                outcome=MatchEvent.Outcome.SUCCESS,
                start_x__isnull=False,
                end_x__isnull=False
            )
            prog_count = 0
            for pass_ev in prog_passes:
                try:
                    if float(pass_ev.end_x) - float(pass_ev.start_x) >= 15.0:
                        prog_count += 1
                except (ValueError, TypeError):
                    pass

            # Shot & Goal metrics
            p_shots = p_events.filter(event_type=MatchEvent.EventType.SHOT)
            shots_count = p_shots.count()
            goals_count = p_shots.filter(outcome=MatchEvent.Outcome.GOAL).count()
            p_xg = p_shots.aggregate(sum_xg=Sum('xg_value'))['sum_xg'] or Decimal('0.0')

            # Defensive actions (Tackle, Interception, Foul)
            tackles_count = p_events.filter(event_type=MatchEvent.EventType.TACKLE, outcome=MatchEvent.Outcome.SUCCESS).count()
            interceptions_count = p_events.filter(event_type=MatchEvent.EventType.INTERCEPTION).count()
            pressured_events = p_events.filter(under_pressure=True).count()

            # Involvement index
            results.append({
                "id": p.id,
                "name": p.full_name,
                "jersey_number": p.jersey_number,
                "team_name": p.team.name,
                "team_code": p.team.short_code,
                "team_color": p.team.primary_color,
                "position": p.primary_position,
                "preferred_foot": p.preferred_foot,
                "total_events": total_evs,
                "passes_attempted": pass_att,
                "passes_completed": pass_comp,
                "pass_accuracy_pct": pass_acc,
                "progressive_passes": prog_count,
                "shots": shots_count,
                "goals": goals_count,
                "xg_total": round(float(p_xg), 2),
                "tackles": tackles_count,
                "interceptions": interceptions_count,
                "pressure_involvements": pressured_events
            })

        # Sort by total involvement / events descending
        results.sort(key=lambda x: x['total_events'], reverse=True)
        return results
