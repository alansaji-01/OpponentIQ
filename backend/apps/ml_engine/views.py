from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .services import MLEngineService
from .models import MLModel

class MLRegistryStatusView(APIView):
    """Returns all models, training metrics, and threshold compliance status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = MLEngineService.get_models_registry_status()
        return Response(data)

class MLTrainModelView(APIView):
    """Triggers verified training pipeline with sample thresholds enforcement."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        algorithm = request.data.get('algorithm')
        if not algorithm:
            return Response({"error": "Missing algorithm parameter (KMEANS, LOGISTIC_REGRESSION, ISOLATION_FOREST, RANDOM_FOREST)"}, status=status.HTTP_400_BAD_REQUEST)

        alg = algorithm.upper()
        if alg == 'KMEANS':
            res = MLEngineService.train_kmeans_tactical_clusters()
        elif alg in ['LOGISTIC_REGRESSION', 'XG']:
            res = MLEngineService.train_xg_logistic_regression()
        elif alg in ['ISOLATION_FOREST', 'ANOMALY']:
            res = MLEngineService.train_isolation_forest_anomalies()
        elif alg in ['RANDOM_FOREST', 'CLASSIFICATION']:
            res = MLEngineService.train_random_forest_style()
        else:
            return Response({"error": f"Unsupported algorithm: {alg}"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(res)
