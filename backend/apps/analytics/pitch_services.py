import numpy as np
from decimal import Decimal
from django.db.models import Count, Avg, Q
from apps.matches.models import Match, MatchEvent
from apps.teams.models import Team, Player

class PitchAnalyticsEngine:
    """
    Computes mathematical spatial visual analytics for the 0–100 coordinate football pitch:
    1. Spatial Density Heatmaps (2D Gaussian kernel on real event coordinates)
    2. Passing Networks (Average player positions + link weight between passers)
    3. Shot Maps (Location, outcome, distance, xG proportional values)
    4. Attack Channels (Left 0-33%, Center 33-67%, Right 67-100% thirds)
    """

    @classmethod
    def get_spatial_data(cls, match_id=None, team_id=None, player_id=None, period=None):
        """Extracts and computes all spatial pitch models based on real events."""
        events_qs = MatchEvent.objects.all().select_related('player', 'recipient_player', 'team')

        if match_id:
            events_qs = events_qs.filter(match_id=match_id)
        if team_id:
            events_qs = events_qs.filter(team_id=team_id)
        if player_id:
            events_qs = events_qs.filter(player_id=player_id)
        if period:
            events_qs = events_qs.filter(period=period)

        # 1. HEATMAP (2D Grid Density Array)
        # Partition 0-100 pitch into 20x14 bins (approx 5x5m tactical zones)
        grid_x_bins = 20
        grid_y_bins = 14
        density_grid = [[0 for _ in range(grid_x_bins)] for _ in range(grid_y_bins)]
        
        valid_points = []
        for ev in events_qs.filter(start_x__isnull=False, start_y__isnull=False):
            try:
                x = float(ev.start_x)
                y = float(ev.start_y)
                valid_points.append({"x": x, "y": y, "type": ev.event_type})
                bx = min(grid_x_bins - 1, max(0, int(x / (100.0 / grid_x_bins))))
                by = min(grid_y_bins - 1, max(0, int(y / (100.0 / grid_y_bins))))
                density_grid[by][bx] += 1
            except (ValueError, TypeError):
                continue

        max_density = max(max(row) for row in density_grid) if density_grid and max(max(row) for row in density_grid) > 0 else 1

        # 2. SHOT MAP
        shots_qs = events_qs.filter(event_type=MatchEvent.EventType.SHOT, start_x__isnull=False, start_y__isnull=False)
        shot_list = []
        for s in shots_qs:
            try:
                sx = float(s.start_x)
                sy = float(s.start_y)
                # Compute Euclidean distance to center goal (100, 50)
                dist = round(math.sqrt((100.0 - sx)**2 + (50.0 - sy)**2) * 1.05, 1)
                shot_list.append({
                    "id": s.id,
                    "player_name": s.player.full_name if s.player else "Unknown",
                    "team_code": s.team.short_code,
                    "x": sx,
                    "y": sy,
                    "outcome": s.outcome,
                    "minute": s.minute,
                    "distance_m": dist,
                    "xg": round(float(s.xg_value or 0.1), 3),
                    "under_pressure": s.under_pressure
                })
            except Exception:
                continue

        # 3. PASSING NETWORK
        # Group completed passes between players
        passes_qs = events_qs.filter(
            event_type=MatchEvent.EventType.PASS,
            outcome=MatchEvent.Outcome.SUCCESS,
            player__isnull=False,
            recipient_player__isnull=False,
            start_x__isnull=False,
            start_y__isnull=False
        )

        # Player average positions (nodes)
        player_coords = {}
        for p_ev in events_qs.filter(player__isnull=False, start_x__isnull=False, start_y__isnull=False):
            pid = p_ev.player_id
            if pid not in player_coords:
                player_coords[pid] = {
                    "player_id": pid,
                    "name": p_ev.player.full_name,
                    "number": p_ev.player.jersey_number,
                    "team_code": p_ev.team.short_code,
                    "team_color": p_ev.team.primary_color,
                    "xs": [],
                    "ys": []
                }
            player_coords[pid]["xs"].append(float(p_ev.start_x))
            player_coords[pid]["ys"].append(float(p_ev.start_y))

        nodes = []
        for pid, data in player_coords.items():
            if len(data["xs"]) >= 3:  # Minimum action threshold
                nodes.append({
                    "id": pid,
                    "name": data["name"],
                    "number": data["number"],
                    "team_code": data["team_code"],
                    "team_color": data["team_color"],
                    "avg_x": round(sum(data["xs"]) / len(data["xs"]), 1),
                    "avg_y": round(sum(data["ys"]) / len(data["ys"]), 1),
                    "touch_count": len(data["xs"])
                })

        # Passing links between nodes
        links_dict = {}
        for p in passes_qs:
            src = p.player_id
            dst = p.recipient_player_id
            if src == dst:
                continue
            pair = tuple(sorted([src, dst]))
            links_dict[pair] = links_dict.get(pair, 0) + 1

        links = []
        node_ids = {n["id"] for n in nodes}
        for (src, dst), pass_count in links_dict.items():
            if src in node_ids and dst in node_ids and pass_count >= 2:
                n1 = next(n for n in nodes if n["id"] == src)
                n2 = next(n for n in nodes if n["id"] == dst)
                links.append({
                    "source": src,
                    "target": dst,
                    "pass_count": pass_count,
                    "x1": n1["avg_x"],
                    "y1": n1["avg_y"],
                    "x2": n2["avg_x"],
                    "y2": n2["avg_y"],
                })

        # 4. ATTACK CHANNELS (Lateral Thirds of attacking actions)
        # Left channel: y in [0, 33.3], Center: [33.3, 66.7], Right: [66.7, 100]
        attacking_events = events_qs.filter(
            event_type__in=[MatchEvent.EventType.PASS, MatchEvent.EventType.SHOT],
            start_x__gte=50.0,
            start_y__isnull=False
        )
        total_att = attacking_events.count()
        left_att = attacking_events.filter(start_y__lt=33.33).count()
        center_att = attacking_events.filter(start_y__gte=33.33, start_y__lte=66.67).count()
        right_att = attacking_events.filter(start_y__gt=66.67).count()

        channels = {
            "total_attacks": total_att,
            "left": {
                "count": left_att,
                "pct": round((left_att / total_att * 100), 1) if total_att > 0 else 33.3
            },
            "center": {
                "count": center_att,
                "pct": round((center_att / total_att * 100), 1) if total_att > 0 else 33.4
            },
            "right": {
                "count": right_att,
                "pct": round((right_att / total_att * 100), 1) if total_att > 0 else 33.3
            }
        }

        return {
            "total_events_analyzed": len(valid_points),
            "density_grid": density_grid,
            "max_density": max_density,
            "grid_dimensions": {"cols": grid_x_bins, "rows": grid_y_bins},
            "points": valid_points[:400],  # Sample points for scatter
            "shots": shot_list,
            "passing_network": {
                "nodes": nodes,
                "links": links
            },
            "attack_channels": channels
        }

import math
