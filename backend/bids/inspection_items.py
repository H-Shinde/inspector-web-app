PART_ITEM_FIELDS = {
    'id': 'itemId', 'name': 'name', 'qty': 'qty', 'type': 'type', 'make': 'make',
    'model': 'model', 'serial': 'serialNumber', 'condition': 'condition',
    'year': 'year', 'mileage': 'hoursMiles', 'comments': 'comments',
}


def merge_inspection_items(items, parts):
    """Expose the latest inspector details while retaining admin-only metadata."""
    result = [{**item, 'itemId': str(item.get('itemId') or f'item-{index}')} for index, item in enumerate(items)]
    positions = {item['itemId']: index for index, item in enumerate(result)}
    for part in parts:
        item_id = str(part['id'])
        index = positions.get(item_id)
        values = {item_key: part.get(part_key, '') for part_key, item_key in PART_ITEM_FIELDS.items()}
        if index is None:
            positions[item_id] = len(result)
            result.append(values)
        else:
            result[index] = {**result[index], **values}
    return result


def parts_from_items(items, saved_parts, only_saved=False):
    saved = {str(part['id']): part for part in saved_parts}
    result = []
    for index, item in enumerate(items):
        item_id = str(item.get('itemId') or f'item-{index}')
        if only_saved and item_id not in saved:
            continue
        result.append({**saved.get(item_id, {}),
            **{part_key: str(item.get(item_key) or '') for part_key, item_key in PART_ITEM_FIELDS.items()},
            'id': item_id, 'photos': saved.get(item_id, {}).get('photos', []),
        })
    return result


def current_job_items(job):
    from .models import initial_job_items
    items = job.items
    if not items and not job.inspectionParts:
        items = initial_job_items(job.source_bid)
    return merge_inspection_items(items, job.inspectionParts)


def inspection_quantity(parts):
    total = 0
    for part in parts:
        quantity = str(part.get('qty') or '').strip()
        if not quantity.isascii() or not quantity.isdigit() or int(quantity) < 1:
            raise ValueError('Enter a positive whole-number quantity for every item.')
        total += int(quantity)
    return total
