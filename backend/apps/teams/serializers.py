from rest_framework import serializers
from .models import Team, Player
from apps.matches.models import MatchTeam, MatchEvent, Match
from django.db.models import Avg, Sum, Count, Q

class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = [
            'id', 'team', 'full_name', 'jersey_number',
            'primary_position', 'preferred_foot', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class TeamSerializer(serializers.ModelSerializer):
    player_count = serializers.IntegerField(source='players.count', read_only=True)
    players = PlayerSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = [
            'id', 'name', 'short_code', 'logo', 'primary_color',
            'default_formation', 'pressing_style', 'is_demo_data',
            'player_count', 'players', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class TeamComparisonSerializer(serializers.Serializer):
    team_a = TeamSerializer()
    team_b = TeamSerializer()
    h2h_matches = serializers.ListField()
    stats = serializers.DictField()
