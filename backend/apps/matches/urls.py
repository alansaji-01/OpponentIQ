from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MatchViewSet, MatchEventViewSet

router = DefaultRouter()
router.register(r'matches', MatchViewSet, basename='match')
router.register(r'events', MatchEventViewSet, basename='matchevent')

urlpatterns = [
    path('', include(router.urls)),
]
