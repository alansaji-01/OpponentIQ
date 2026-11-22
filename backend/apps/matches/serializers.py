from rest_framework import serializers
from .models import Match, MatchTeam, MatchEvent
from apps.teams.serializers import TeamSerializer, PlayerSerializer
from apps.teams.models import Team, Player

class MatchTeamSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    team_code = serializers.CharField(source='team.short_code', read_only=True)
    team_color = serializers.CharField(source='team.primary_color', read_only=True)

    class Meta:
        model = MatchTeam
        fields = [
            'id', 'match', 'team', 'team_name', 'team_code', 'team_color',
            'is_home', 'formation_used', 'possession_pct', 'ppda',
            'shots', 'shots_on_target', 'passes_completed', 'passes_attempted',
            'tackles', 'interceptions', 'fouls', 'corners', 'offsides'
        ]
        read_only_fields = ['id']

class MatchEventSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source='player.full_name', read_only=True)
    recipient_player_name = serializers.CharField(source='recipient_player.full_name', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    team_code = serializers.CharField(source='team.short_code', read_only=True)

    class Meta:
        model = MatchEvent
        fields = [
            'id', 'match', 'team', 'team_name', 'team_code',
            'player', 'player_name', 'recipient_player', 'recipient_player_name',
            'period', 'minute', 'second', 'event_type', 'outcome',
            'start_x', 'start_y', 'end_x', 'end_y', 'under_pressure', 'xg_value'
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        # Enforce pitch coordinate bounds (0 to 100)
        for coord in ['start_x', 'start_y', 'end_x', 'end_y']:
            val = attrs.get(coord)
            if val is not None and not (0 <= float(val) <= 100):
                raise serializers.ValidationError({coord: f"{coord} must be between 0.0 and 100.0"})
        return attrs

class MatchListSerializer(serializers.ModelSerializer):
    home_team_name = serializers.CharField(source='home_team.name', read_only=True)
    home_team_code = serializers.CharField(source='home_team.short_code', read_only=True)
    home_team_color = serializers.CharField(source='home_team.primary_color', read_only=True)
    away_team_name = serializers.CharField(source='away_team.name', read_only=True)
    away_team_code = serializers.CharField(source='away_team.short_code', read_only=True)
    away_team_color = serializers.CharField(source='away_team.primary_color', read_only=True)
    event_count = serializers.IntegerField(source='events.count', read_only=True)

    class Meta:
        model = Match
        fields = [
            'id', 'home_team', 'home_team_name', 'home_team_code', 'home_team_color',
            'away_team', 'away_team_name', 'away_team_code', 'away_team_color',
            'match_date', 'competition', 'home_score', 'away_score',
            'status', 'venue', 'is_demo_data', 'event_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class MatchDetailSerializer(MatchListSerializer):
    match_teams = MatchTeamSerializer(many=True, read_only=True)
    events = MatchEventSerializer(many=True, read_only=True)

    class Meta(MatchListSerializer.Meta):
        fields = MatchListSerializer.Meta.fields + ['match_teams', 'events']
