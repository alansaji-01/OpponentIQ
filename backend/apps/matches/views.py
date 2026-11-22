import io
import csv
import json
from decimal import Decimal
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Match, MatchTeam, MatchEvent
from .serializers import (
    MatchListSerializer,
    MatchDetailSerializer,
    MatchTeamSerializer,
    MatchEventSerializer
)
from apps.teams.models import Team, Player

class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.all().select_related('home_team', 'away_team').prefetch_related('match_teams__team')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['retrieve']:
            return MatchDetailSerializer
        return MatchListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        team_id = self.request.query_params.get('team')
        if team_id:
            qs = qs.filter(Q(home_team_id=team_id) | Q(away_team_id=team_id))
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param.upper())
        is_demo = self.request.query_params.get('is_demo')
        if is_demo is not None:
            qs = qs.filter(is_demo_data=is_demo.lower() in ('true', '1'))
        return qs

    @action(detail=True, methods=['get'], url_path='timeline')
    def timeline(self, request, pk=None):
        """Chronological match event breakdown."""
        match = self.get_object()
        events = match.events.select_related('team', 'player', 'recipient_player').order_by('period', 'minute', 'second')
        event_type = request.query_params.get('type')
        if event_type:
            events = events.filter(event_type=event_type.upper())
        serializer = MatchEventSerializer(events, many=True)
        return Response({
            "match_id": match.id,
            "home_team": match.home_team.name,
            "away_team": match.away_team.name,
            "score": f"{match.home_score} - {match.away_score}",
            "event_count": events.count(),
            "events": serializer.data
        })

class MatchEventViewSet(viewsets.ModelViewSet):
    queryset = MatchEvent.objects.all().select_related('match', 'team', 'player', 'recipient_player')
    serializer_class = MatchEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        match_id = self.request.query_params.get('match')
        if match_id:
            qs = qs.filter(match_id=match_id)
        team_id = self.request.query_params.get('team')
        if team_id:
            qs = qs.filter(team_id=team_id)
        player_id = self.request.query_params.get('player')
        if player_id:
            qs = qs.filter(player_id=player_id)
        event_type = self.request.query_params.get('type')
        if event_type:
            qs = qs.filter(event_type=event_type.upper())
        return qs

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser], url_path='batch-import')
    def batch_import(self, request):
        """
        Validated CSV / JSON batch event importer with row-level error reporting.
        Accepts:
          - A file upload (.csv or .json)
          - OR raw JSON body under 'events' or directly as a list
        """
        events_data = []
        uploaded_file = request.FILES.get('file')

        if uploaded_file:
            filename = uploaded_file.name.lower()
            content = uploaded_file.read()
            if filename.endswith('.json'):
                try:
                    parsed = json.loads(content.decode('utf-8'))
                    events_data = parsed if isinstance(parsed, list) else parsed.get('events', [])
                except Exception as e:
                    return Response({"error": f"Invalid JSON file format: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
            elif filename.endswith('.csv'):
                try:
                    text_stream = io.StringIO(content.decode('utf-8'))
                    reader = csv.DictReader(text_stream)
                    for row in reader:
                        events_data.append(dict(row))
                except Exception as e:
                    return Response({"error": f"Invalid CSV file format: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"error": "Unsupported file format. Please upload .csv or .json"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if isinstance(request.data, list):
                events_data = request.data
            elif isinstance(request.data, dict) and 'events' in request.data:
                events_data = request.data['events']
            else:
                return Response({"error": "No file uploaded or 'events' JSON array provided."}, status=status.HTTP_400_BAD_REQUEST)

        if not events_data:
            return Response({"error": "Batch payload is empty."}, status=status.HTTP_400_BAD_REQUEST)

        valid_events = []
        row_errors = []
        
        # Cache teams and players for performant validation
        teams_cache = {t.short_code.upper(): t for t in Team.objects.all()}
        teams_id_cache = {t.id: t for t in teams_cache.values()}
        
        for idx, row in enumerate(events_data, start=1):
            row_err = []
            
            # Resolve Match
            match_id = row.get('match_id') or row.get('match')
            if not match_id:
                row_err.append("Missing required field: match / match_id")
            
            # Resolve Team
            team_val = row.get('team') or row.get('team_code') or row.get('team_id')
            team_obj = None
            if not team_val:
                row_err.append("Missing team identifier (team, team_code, or team_id)")
            else:
                if str(team_val).upper() in teams_cache:
                    team_obj = teams_cache[str(team_val).upper()]
                elif str(team_val).isdigit() and int(team_val) in teams_id_cache:
                    team_obj = teams_id_cache[int(team_val)]
                else:
                    try:
                        team_obj = Team.objects.get(name__iexact=str(team_val).strip())
                    except Team.DoesNotExist:
                        row_err.append(f"Team '{team_val}' not found in registry")

            # Resolve Player
            player_obj = None
            player_val = row.get('player') or row.get('player_id') or row.get('player_name')
            if player_val and team_obj:
                if str(player_val).isdigit():
                    player_obj = Player.objects.filter(team=team_obj, id=int(player_val)).first()
                if not player_obj:
                    player_obj = Player.objects.filter(team=team_obj, full_name__iexact=str(player_val).strip()).first()
                if not player_obj and str(row.get('jersey_number', '')).isdigit():
                    player_obj = Player.objects.filter(team=team_obj, jersey_number=int(row['jersey_number'])).first()

            # Event type & Minute
            event_type = str(row.get('event_type', '')).upper()
            if event_type not in MatchEvent.EventType.values:
                row_err.append(f"Invalid event_type: '{event_type}'. Valid: {list(MatchEvent.EventType.values)}")

            minute = row.get('minute')
            try:
                minute = int(minute)
                if not (0 <= minute <= 130):
                    row_err.append(f"Minute out of range: {minute}")
            except (ValueError, TypeError):
                row_err.append(f"Invalid minute value: {minute}")

            # Coordinates validation (0 to 100)
            coords = {}
            for c_field in ['start_x', 'start_y', 'end_x', 'end_y']:
                val = row.get(c_field)
                if val is not None and str(val).strip() != '':
                    try:
                        d_val = Decimal(str(val))
                        if not (Decimal('0.0') <= d_val <= Decimal('100.0')):
                            row_err.append(f"{c_field} coordinate must be between 0 and 100 (got {val})")
                        coords[c_field] = d_val
                    except Exception:
                        row_err.append(f"Invalid numeric format for {c_field}: {val}")
                else:
                    coords[c_field] = None

            # Outcome & Pressure
            outcome = str(row.get('outcome', 'SUCCESS')).upper()
            if outcome not in MatchEvent.Outcome.values:
                outcome = MatchEvent.Outcome.SUCCESS

            under_pressure = str(row.get('under_pressure', '')).lower() in ('true', '1', 'yes')

            xg_val = row.get('xg_value')
            xg_decimal = None
            if xg_val is not None and str(xg_val).strip() != '':
                try:
                    xg_decimal = Decimal(str(xg_val))
                except Exception:
                    pass

            if row_err:
                row_errors.append({
                    "row_index": idx,
                    "row_data": row,
                    "errors": row_err
                })
            else:
                valid_events.append(MatchEvent(
                    match_id=int(match_id),
                    team=team_obj,
                    player=player_obj,
                    period=int(row.get('period', 1)),
                    minute=minute,
                    second=int(row.get('second', 0)),
                    event_type=event_type,
                    outcome=outcome,
                    start_x=coords.get('start_x'),
                    start_y=coords.get('start_y'),
                    end_x=coords.get('end_x'),
                    end_y=coords.get('end_y'),
                    under_pressure=under_pressure,
                    xg_value=xg_decimal
                ))

        # Atomic commit of all valid events if requested, or report row errors
        inserted_count = 0
        if valid_events:
            with transaction.atomic():
                created = MatchEvent.objects.bulk_create(valid_events)
                inserted_count = len(created)

        return Response({
            "status": "partial_success" if row_errors and inserted_count > 0 else ("success" if not row_errors else "failed"),
            "total_submitted": len(events_data),
            "successfully_inserted": inserted_count,
            "error_count": len(row_errors),
            "row_errors": row_errors
        }, status=status.HTTP_201_CREATED if inserted_count > 0 else status.HTTP_400_BAD_REQUEST)
