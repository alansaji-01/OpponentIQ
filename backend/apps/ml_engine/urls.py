from django.urls import path
from .views import MLRegistryStatusView, MLTrainModelView

urlpatterns = [
    path('ml/models/', MLRegistryStatusView.as_view(), name='ml-models-registry'),
    path('ml/train/', MLTrainModelView.as_view(), name='ml-train-model'),
]
