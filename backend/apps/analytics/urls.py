from django.urls import path
from .views import OverviewKPIsView, PlayerAnalyticsView, PitchSpatialAnalyticsView

urlpatterns = [
    path('analytics/overview/', OverviewKPIsView.as_view(), name='analytics-overview'),
    path('analytics/players/', PlayerAnalyticsView.as_view(), name='analytics-players'),
    path('analytics/pitch-spatial/', PitchSpatialAnalyticsView.as_view(), name='analytics-pitch-spatial'),
]
