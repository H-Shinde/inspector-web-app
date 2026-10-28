import json
import math
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def zip_locations():
    return json.loads((Path(__file__).parent / 'data' / 'us_zip_codes.json').read_text())


def zip_location(zip_code):
    return zip_locations().get(str(zip_code or '')[:5])


def distance_miles(origin, destination):
    if not origin or not destination:
        return None
    lat1, lon1, lat2, lon2 = map(math.radians, [origin[0], origin[1], destination[0], destination[1]])
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 3958.8 * 2 * math.asin(math.sqrt(min(1, max(0, h))))
