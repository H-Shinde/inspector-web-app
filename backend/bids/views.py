from django.db import transaction
import json
import uuid

from django.http import JsonResponse, FileResponse
from django import forms
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_GET, require_http_methods

from .forms import BidForm
from .models import Bid, Inspector, Job


def serialize_bid(bid, include_job=True):
    result = {
        field.name: getattr(bid, field.name)
        for field in Bid._meta.fields
        if field.name not in ["owner", "inspector", "agreement"]
    }

    result.update({
        "referenceNumber": bid.referenceNumber,
        "jobId": getattr(getattr(bid, "job", None), "pk", None) if include_job else None,
        "totalBid": str(bid.totalBid),
        "hasAgreement": bool(bid.agreement),
        "engagementAgreement": f"{bid.referenceNumber}-engagement-agreement.pdf" if bid.agreement else "",
        "recordType": "Bid",
    })

    return result


from .inspector_views import inspectors


@require_http_methods(["GET", "POST"])
def bids(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Sign in required."}, status=401)

    if request.method == "GET":
        rows = Bid.objects.filter(
            owner=request.user,
        ).select_related("inspector").order_by("-createdAt")
        if request.GET.get("history") == "1":
            rows = rows.exclude(status="Pending")
        else:
            rows = rows.filter(status="Pending")

        return JsonResponse({
            "bids": [serialize_bid(bid) for bid in rows]
        })

    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    if not isinstance(data, dict):
        return JsonResponse({"error": "Invalid request."}, status=400)

    data["date"] = data.get("date") or timezone.localdate().isoformat()

    form = BidForm(data, user=request.user)

    if not form.is_valid():
        message = " ".join(
            str(error)
            for errors in form.errors.values()
            for error in errors
        )
        return JsonResponse(
            {"error": message, "fields": form.errors.get_json_data()},
            status=400,
        )

    bid = form.save(commit=False)
    bid.owner = request.user
    bid.save()

    return JsonResponse(serialize_bid(bid), status=201)

@require_http_methods(["GET", "PATCH", "DELETE"])
@transaction.atomic
def bid_detail(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Sign in required."}, status=401)
    bid = get_object_or_404(Bid.objects.select_for_update().select_related("inspector", "job"), pk=pk, owner=request.user)
    if request.method == "GET":
        return JsonResponse(serialize_bid(bid))
    if request.method == "DELETE":
        bid.status = "Deleted"
        bid.save(update_fields=["status"])
        return JsonResponse(serialize_bid(bid))
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON."}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({"error": "Invalid request."}, status=400)
    if bid.status != "Pending":
        if bid.status == 'Accepted' and data == {'status': 'Accepted'}:
            job, _ = Job.objects.get_or_create(source_bid=bid, defaults={'owner': request.user})
            bid.job = job
            return JsonResponse(serialize_bid(bid))
        return JsonResponse({'error': 'Only pending bids can be changed.'}, status=409)
    status = data.pop("status", None)
    if status is not None:
        if status not in ["Accepted", "Declined"] or data:
            return JsonResponse({"error": "Submit a valid bid decision separately from edits."}, status=400)
        bid.status = status
        bid.save(update_fields=["status"])
        if status == "Accepted":
            job, _ = Job.objects.get_or_create(source_bid=bid, defaults={"owner": request.user})
            bid.job = job
        return JsonResponse(serialize_bid(bid))
    current = serialize_bid(bid)
    current.update(data)
    form = BidForm(current, instance=bid, user=request.user)
    if not form.is_valid():
        return JsonResponse({"error": " ".join(str(error) for errors in form.errors.values() for error in errors)}, status=400)
    bid = form.save()
    return JsonResponse(serialize_bid(bid))


@require_http_methods(["GET", "POST"])
def bid_agreement(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Sign in required."}, status=401)
    bid = get_object_or_404(Bid, pk=pk, owner=request.user)
    if request.method == "GET":
        if not bid.agreement:
            return JsonResponse({"error": "No agreement has been uploaded for this bid."}, status=404)
        try:
            return FileResponse(bid.agreement.open("rb"), as_attachment=True,
                                filename=f"{bid.referenceNumber}-engagement-agreement.pdf", content_type="application/pdf")
        except FileNotFoundError:
            return JsonResponse({"error": "The saved agreement is unavailable."}, status=404)
    if bid.status != "Pending":
        return JsonResponse({"error": "Only pending bid agreements can be updated."}, status=409)
    upload = request.FILES.get("agreement")
    if not upload or upload.size > 10 * 1024 * 1024:
        return JsonResponse({"error": "Upload a PDF smaller than 10 MB."}, status=400)
    if not upload.read(5).startswith(b"%PDF-"):
        return JsonResponse({"error": "The agreement must be a PDF."}, status=400)
    upload.seek(0)
    old_name = bid.agreement.name
    storage = bid.agreement.storage
    bid.agreement.save(f"{bid.referenceNumber}-{uuid.uuid4().hex}.pdf", upload)
    if old_name and old_name != bid.agreement.name:
        storage.delete(old_name)
    return JsonResponse(serialize_bid(bid))
