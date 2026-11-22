from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from .views import CustomTokenObtainPairView, RegisterView, MeView, UserListView

urlpatterns = [
    # JWT Auth Routes
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('auth/register/', RegisterView.as_view(), name='register'),

    # User Profile & Directory
    path('users/me/', MeView.as_view(), name='user-me'),
    path('users/', UserListView.as_view(), name='user-list'),
]
