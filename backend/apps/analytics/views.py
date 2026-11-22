from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import AnalyticsEngine
from .pitch_services import PitchAnalyticsEngine

class OverviewKPIsView(APIView):
    """Returns live PostgreSQL aggregated dashboard metrics and distributions."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = AnalyticsEngine.get_overview_dashboard_kpis()
        return Response(data)

class PlayerAnalyticsView(APIView):
    """Returns real player-level passing, progressive passing, xG, and defensive metrics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        team_id = request.query_params.get('team')
        position = request.query_params.get('position')
        data = AnalyticsEngine.get_player_analytics_dataset(team_id=team_id, position=position)
        return Response(data)

class PitchSpatialAnalyticsView(APIView):
    """Returns 0-100 pitch spatial models: heatmaps, passing networks, shot maps, attack channels."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        match_id = request.query_params.get('match')
        team_id = request.query_params.get('team')
        player_id = request.query_params.get('player')
        period = request.query_params.get('period')
        
        data = PitchAnalyticsEngine.get_spatial_data(
            match_id=match_id,
            team_id=team_id,
            player_id=player_id,
            period=period
        )
        return Response(data)
