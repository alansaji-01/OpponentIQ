from django.contrib import admin
from .models import Team, Player

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'short_code', 'default_formation', 'pressing_style', 'is_demo_data', 'created_at']
    list_filter = ['is_demo_data', 'pressing_style', 'default_formation']
    search_fields = ['name', 'short_code']

@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'jersey_number', 'team', 'primary_position', 'preferred_foot', 'is_active']
    list_filter = ['primary_position', 'preferred_foot', 'is_active', 'team']
    search_fields = ['full_name', 'team__name']
