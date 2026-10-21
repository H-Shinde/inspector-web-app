import json
import uuid

from django.http import JsonResponse, FileResponse
from django import forms
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_GET, require_http_methods

from .forms import BidForm
from .models import Bid, Inspector


def serialize_bid(bid):
    result = {
        field.name: getattr(bid, field.name)
        for field in Bid._meta.fields
        if field.name not in ["owner", "inspector", "agreement"]
    }

    result.update({
        "inspectorId": bid.inspector_id,
        "inspector": bid.inspector.name,
        "referenceNumber": bid.referenceNumber,
        "totalBid": str(bid.totalBid),
        "hasAgreement": bool(bid.agreement),
        "engagementAgreement": f"{bid.referenceNumber}-engagement-agreement.pdf" if bid.agreement else "",
        "recordType": "Bid",
    })

    return result


class InspectorForm(forms.ModelForm):
    class Meta:
        model = Inspector
        fields = ["name", "email"]


@require_http_methods(["GET", "POST"])
def inspectors(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Sign in required."}, status=401)

    if request.method == "POST":
        try:
            data = json.loads(request.body)
        except (ValueError, UnicodeDecodeError):
            return JsonResponse({"error": "Invalid JSON."}, status=400)
        if not isinstance(data, dict):
            return JsonResponse({"error": "Invalid request."}, status=400)
        form = InspectorForm(data)
        if not form.is_valid():
            return JsonResponse({"error": " ".join(str(error) for errors in form.errors.values() for error in errors)}, status=400)
        inspector = form.save(commit=False)
        inspector.owner = request.user
        inspector.save()
        return JsonResponse({"id": inspector.pk, "name": inspector.name, "email": inspector.email}, status=201)
    rows = Inspector.objects.filter(
        owner=request.user,
        is_active=True,
    ).values("id", "name", "email")

    return JsonResponse({"inspectors": list(rows)})


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

    # React uses inspectorId; the ModelForm expects inspector.
    data["inspector"] = data.get("inspectorId")
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
def bid_detail(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Sign in required."}, status=401)
    bid = get_object_or_404(Bid.objects.select_related("inspector"), pk=pk, owner=request.user)
    if request.method == "GET":
        return JsonResponse(serialize_bid(bid))
    if request.method == "DELETE":
        bid.status = "Deleted"
        bid.save(update_fields=["status"])
        return JsonResponse(serialize_bid(bid))
    if bid.status != "Pending":
        return JsonResponse({"error": "Only pending bids can be changed."}, status=409)
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON."}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({"error": "Invalid request."}, status=400)
    status = data.pop("status", None)
    if status is not None:
        if status not in ["Accepted", "Declined"] or data:
            return JsonResponse({"error": "Submit a valid bid decision separately from edits."}, status=400)
        if status == "Accepted" and not bid.inspector.is_active:
            return JsonResponse({"error": "Assign an active inspector before deciding this bid."}, status=400)
        bid.status = status
        bid.save(update_fields=["status"])
        return JsonResponse(serialize_bid(bid))
    current = serialize_bid(bid)
    current.update(data)
    current["inspector"] = current["inspectorId"]
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
