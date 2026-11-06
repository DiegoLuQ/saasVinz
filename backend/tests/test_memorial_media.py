"""Fase 5 de planes de memorial: video y audio de voz (Infinito, 30 s cada uno)."""
import os
import subprocess
import tempfile
import uuid

import imageio_ffmpeg
import pytest

from tests.test_memorial_phase2 import _vinzer_memorial


def _gen(args: list[str], ext: str) -> bytes:
    path = os.path.join(tempfile.gettempdir(), f"t_{uuid.uuid4().hex}{ext}")
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-y", *args, path],
                   check=True, timeout=120)
    try:
        return open(path, "rb").read()
    finally:
        os.remove(path)


@pytest.fixture(scope="module")
def clips():
    return {
        "video": _gen(["-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=10",
                       "-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-shortest",
                       "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"], ".mp4"),
        "voice": _gen(["-f", "lavfi", "-i", "sine=frequency=300:duration=3", "-c:a", "aac"], ".m4a"),
        "webm_voice": _gen(["-f", "lavfi", "-i", "sine=frequency=300:duration=3", "-c:a", "libopus", "-f", "webm"], ".webm"),
        "long_voice": _gen(["-f", "lavfi", "-i", "sine=frequency=300:duration=35", "-c:a", "aac"], ".m4a"),
    }


def test_infinito_sube_video_y_voz(client, world, auth, db, clips):
    m, pin = _vinzer_memorial(client, auth, db, plan="infinito", pet="SuVoz")
    h = {"access-key": pin}
    base = f"/api/internal/memorials/{m.id_recuerdo}/manage/media"
    opts = client.get(base, headers=h).json()
    assert opts["max_videos"] == 1 and opts["max_voice"] == 1 and opts["max_seconds"] == 30
    assert client.get(base).status_code == 401

    r = client.post(base, data={"kind": "video", "titulo": "Jugando"}, files={"file": ("v.mp4", clips["video"], "video/mp4")}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["videos"][0]["url"].endswith(".mp4")
    # solo 1 video
    again = client.post(base, data={"kind": "video"}, files={"file": ("v.mp4", clips["video"], "video/mp4")}, headers=h)
    assert again.status_code == 400

    assert client.post(base, data={"kind": "voice"}, files={"file": ("l.m4a", clips["long_voice"], "audio/mp4")},
                       headers=h).status_code == 400  # > 30 s
    r = client.post(base, data={"kind": "voice"}, files={"file": ("v.m4a", clips["voice"], "audio/mp4")}, headers=h)
    assert r.status_code == 200, r.text
    voice = r.json()["voices"][0]
    assert 2 <= voice["duration"] <= 30

    pub = client.get(f"/api/internal/memorials/{m.id_recuerdo}").json()
    assert len(pub["videos"]) == 1 and len(pub["voices"]) == 1

    r = client.delete(f"{base}/{voice['id']}", headers=h)
    assert r.status_code == 200 and r.json()["voices"] == []
    # grabada en el navegador (webm/opus)
    r = client.post(base, data={"kind": "voice"}, files={"file": ("voz.webm", clips["webm_voice"], "audio/webm")}, headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["voices"][0]["url"].endswith(".m4a")


def test_otros_planes_no_tienen_video_ni_voz(client, world, auth, db, clips):
    m, pin = _vinzer_memorial(client, auth, db, plan="eterno", pet="SinVideo")
    base = f"/api/internal/memorials/{m.id_recuerdo}/manage/media"
    r = client.post(base, data={"kind": "video"}, files={"file": ("v.mp4", clips["video"], "video/mp4")},
                    headers={"access-key": pin})
    assert r.status_code == 403
    pub = client.get(f"/api/internal/memorials/{m.id_recuerdo}").json()
    assert pub["videos"] == [] and pub["voices"] == []
