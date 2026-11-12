from django.http import JsonResponse, FileResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET
from .models import InspectionPhoto
from .inspection_items import current_job_items


@require_GET
def inspection_photo(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    photos = InspectionPhoto.objects.select_related('job__source_bid', 'job__inspector')
    if request.path.startswith('/api/inspector/'):
        photos = photos.filter(job__inspector__user=request.user, job__inspector__is_active=True)
    else:
        photos = photos.filter(job__owner=request.user)
    photo = get_object_or_404(photos, pk=pk)
    if photo.job.status == 'Deleted' or photo.partId not in {item['itemId'] for item in current_job_items(photo.job)}:
        return JsonResponse({'error': 'Photo unavailable.'}, status=404)
    try:
        result = FileResponse(photo.file.open('rb'), content_type=photo.contentType, filename=photo.name)
        result['X-Content-Type-Options'] = 'nosniff'
        result['Cache-Control'] = 'private, no-store'
        return result
    except FileNotFoundError:
        return JsonResponse({'error': 'Photo unavailable.'}, status=404)
