"""Cross-boundary checks for the app namespace migration; no Android SDK needed."""
from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
NS = "io.github.jaitak2121spec.dhun"
JAVA = ROOT / "app/src/main/java" / NS.replace(".", "/")
ANDROID = "{http://schemas.android.com/apk/res/android}"


class DhunIdentityTest(unittest.TestCase):
    def test_shipping_flavors_and_update_messages_use_the_dhun_name(self):
        for source in (ROOT / "app/src").glob("*/AndroidManifest.xml"):
            app = ET.parse(source).getroot().find("application")
            if app is not None and app.get(ANDROID + "label") is not None:
                self.assertEqual("@string/app_name", app.get(ANDROID + "label"), str(source))
        for source in (ROOT / "app/src/main/res").glob("values*/strings.xml"):
            strings = {node.get("name"): "".join(node.itertext()) for node in ET.parse(source).getroot() if node.tag == "string"}
            self.assertEqual("Dhun", strings["app_name"], str(source))
            for key in ("update_available_body", "update_downloading_body", "update_ready_body", "update_failed_body"):
                self.assertIn("Dhun", strings[key], f"{source}: {key}")
                self.assertNotRegex(strings[key], r"(?i)doll.?bloom", f"{source}: {key}")

    def test_manifest_classes_and_launcher_resolve(self):
        manifest = ET.parse(ROOT / "app/src/main/AndroidManifest.xml").getroot()
        app = manifest.find("application")
        classes = set()
        for source in JAVA.rglob("*.kt"):
            text = source.read_text()
            package = re.search(r"^package ([\w.]+)", text, re.M).group(1)
            classes.update(package + "." + name for name in re.findall(r"\bclass (\w+)", text))
        for element in [app, *app.findall("activity"), *app.findall("service"), *app.findall("receiver")]:
            name = element.get(ANDROID + "name", "")
            if name.startswith("."):
                self.assertIn(NS + name, classes)
        icon = app.get(ANDROID + "icon").split("/")[1]
        launcher = ET.parse(ROOT / f"app/src/main/res/mipmap-anydpi/{icon}.xml").getroot()
        self.assertEqual("adaptive-icon", launcher.tag)
        self.assertIsNotNone(launcher.find("monochrome"))

    def test_kotlin_paths_match_packages_after_migration(self):
        for source in (ROOT / "app/src").glob("*/java/**/*.kt"):
            text = source.read_text()
            package = re.search(r"^package ([\w.]+)", text, re.M)
            self.assertIsNotNone(package, str(source))
            expected = Path(package.group(1).replace(".", "/"))
            self.assertTrue(str(source.parent).endswith(str(expected)), str(source))

    def test_native_exports_match_all_external_methods(self):
        native = "\n".join(p.read_text() for p in (ROOT / "app/src/main/cpp/jni").glob("*.cpp"))
        prefix = "Java_" + NS.replace(".", "_") + "_playback_smart_"
        for filename, cls in [("TrackFeatures.kt", "TrackFeatures"),
                              ("MelSpectrogram.kt", "MelSpectrogram"),
                              ("VocalTracker.kt", "VocalSpectrogram")]:
            source = (JAVA / "playback/smart" / filename).read_text()
            methods = re.findall(r"external fun (\w+)\(", source)
            self.assertTrue(methods)
            for method in methods:
                self.assertRegex(native, re.escape(prefix + cls + "_" + method) + r"\s*\(")
        self.assertNotIn("Java_com_doll_bloom_", native)
        cmake = (ROOT / "app/src/main/cpp/CMakeLists.txt").read_text()
        for source in (JAVA / "playback/smart").glob("*.kt"):
            for library in re.findall(r'System.loadLibrary\("([^\"]+)"\)', source.read_text()):
                self.assertIn(f"add_library({library} SHARED", cmake)

    def test_all_android_xml_is_well_formed(self):
        for source in (ROOT / "app/src").glob("**/*.xml"):
            ET.parse(source)

    def test_active_ui_does_not_use_archived_brand_images(self):
        for source in JAVA.rglob("*.kt"):
            self.assertNotRegex(source.read_text(), r"R\.drawable\.(ic_wordmark|ic_logo|ic_notification_logo)\b", str(source))

    def test_localized_resources_cover_all_translatable_labels(self):
        resources = ROOT / "app/src/main/res"
        def keys(source):
            return {node.get("name") for node in ET.parse(source).getroot()
                    if node.tag in {"string", "plurals", "string-array"}
                    and node.get("translatable") != "false"}
        base = keys(resources / "values/strings.xml")
        for source in resources.glob("values-*/strings.xml"):
            self.assertFalse(base - keys(source), f"{source.parent.name}: {base - keys(source)}")


if __name__ == "__main__":
    unittest.main()
