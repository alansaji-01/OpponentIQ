import json
from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import VideoJob, PlayerTracking
from .services import VideoAnalysisEngine
from apps.matches.models import Match

class VideoJobViewSet(viewsets.ModelViewSet):
    queryset = VideoJob.objects.all().select_related('match')
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def list(self, request):
        jobs = self.get_queryset()
        data = [{
            "id": j.id,
            "match_id": j.match_id,
            "match_title": f"{j.match.home_team.name} vs {j.match.away_team.name}",
            "status": j.status,
            "progress_pct": j.progress_pct,
            "total_frames": j.total_frames,
            "processed_frames": j.processed_frames,
            "created_at": j.created_at.strftime('%Y-%m-%d %H:%M')
        } for j in jobs]
        return Response(data)

    @action(detail=False, methods=['post'], url_path='analyze-frame')
    def analyze_frame(self, request):
        """
        Real-time single-frame analysis endpoint.
        Calculates 4-point homography pitch calibration, tracking bounding boxes, and speeds.
        """
        match_id = request.data.get('match_id')
        pts_json = request.data.get('homography_points')
        
        src_points = None
        if pts_json:
            try:
                src_points = json.loads(pts_json) if isinstance(pts_json, str) else pts_json
            except Exception:
                src_points = None

        timestamp = float(request.data.get('timestamp', 0.0))
        H = VideoAnalysisEngine.compute_homography_matrix(src_points)
        detections = VideoAnalysisEngine.process_video_stream_frame(H=H, timestamp=timestamp)

        # Optionally persist tracking records if match specified
        if match_id and str(match_id).isdigit():
            match = Match.objects.filter(id=int(match_id)).first()
            if match and detections:
                tracking_objs = [
                    PlayerTracking(
                        match=match,
                        track_id=d['track_id'],
                        frame_number=int(request.data.get('frame_number', 1)),
                        timestamp_sec=Decimal(str(round(timestamp, 3))),
                        pitch_x=Decimal(str(d['pitch_x'])),
                        pitch_y=Decimal(str(d['pitch_y'])),
                        pixel_x=Decimal(str(d['pixel_x'])),
                        pixel_y=Decimal(str(d['pixel_y'])),
                        speed_mps=Decimal(str(d['speed_mps'])),
                        is_calibrated=True
                    ) for d in detections
                ]
                PlayerTracking.objects.bulk_create(tracking_objs)

        return Response({
            "status": "success",
            "frame_width": 1280,
            "frame_height": 720,
            "detections_count": len(detections),
            "detections": detections,
            "homography_calibrated": True
        })
