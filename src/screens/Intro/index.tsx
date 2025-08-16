import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  I18nManager,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import { useDispatch, useSelector } from "react-redux";
import { Text } from "@/components/Text";
import { TextBold } from "@/components/TextBold";
import i18n from "@/i18n";
import { setLanguage } from "@/redux/slice/languageSlice";

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type SpeechRecognitionErrorCode,
} from "expo-speech-recognition";

const screenWidth = Dimensions.get("window").width;

const EN_COMMANDS = ["next", "start", "begin", "go", "continue", "proceed"];
const UR_COMMANDS = ["اگلا", "شروع", "اگے", "جاری"];

export default function WelcomeScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const language = useSelector((s: any) => s.language.language) as "en" | "ur";

  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const navigatedRef = useRef(false);

  // Simple network-aware navigation
  const checkConnection = useCallback(async () => {
    const net = await NetInfo.fetch();
    if (net.isConnected && (net.type === "wifi" || net.type === "cellular")) {
      router.push("/(signin)");
    } else if (!net.isConnected) {
      Alert.alert("No Internet Connection", "You are not connected to the internet.");
      router.push("/(tabs)/(home)");
    } else {
      Alert.alert("No Network", "Please check your network connection.");
    }
  }, [router]);

  // === Speech Recognition events ===
  useSpeechRecognitionEvent("start", () => setRecognizing(true));
  useSpeechRecognitionEvent("end", () => setRecognizing(false));

  useSpeechRecognitionEvent("result", (event) => {
    // event.results is an array; take the top hypothesis
    const said = (event.results?.[0]?.transcript ?? "").toLowerCase().trim();
    if (!said) return;

    setTranscript((prev) => (prev ? `${prev}\n${said}` : said));

    const isCmd =
      EN_COMMANDS.some((w) => said.includes(w)) ||
      UR_COMMANDS.some((w) => said.includes(w));

    if (isCmd && !navigatedRef.current) {
      navigatedRef.current = true;
      // stop gracefully; final "end" will fire
      try { ExpoSpeechRecognitionModule.stop(); } catch {}
      // small delay to let UI settle
      setTimeout(() => { checkConnection(); }, 300);
    }
  });

  useSpeechRecognitionEvent("error", (e) => {
    setRecognizing(false);
    const code = e.error as SpeechRecognitionErrorCode;
    let msg = e.message || "Speech recognition failed.";
    if (code === "no-speech") msg = "No speech detected. Please try again.";
    if (code === "not-allowed") msg = "Microphone/Speech permission denied.";
    if (code === "service-not-allowed") msg = "Speech service not available. Check device settings.";
    if (code === "language-not-supported") msg = "Selected language not supported on this device.";
    Alert.alert("Speech Error", msg);
  });

  // === Permissions & availability ===
  const ensurePermissions = useCallback(async () => {
    // Library provides a unified permission API
    const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!res.granted) return false;

    // On Android, also ensure microphone permission if needed
    if (Platform.OS === "android") {
      const mic = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (mic !== PermissionsAndroid.RESULTS.GRANTED) return false;
    }

    // Check service availability (Google/On-device) to fail fast
    const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
    if (!available) {
      Alert.alert(
        "Unavailable",
        "Speech recognition is not available. Ensure Google Speech Service is installed/enabled."
      );
      return false;
    }
    return true;
  }, []);

  const startListening = useCallback(async () => {
    navigatedRef.current = false;
    const ok = await ensurePermissions();
    if (!ok) return;

    try {
      await ExpoSpeechRecognitionModule.start({
        lang: language === "ur" ? "ur-PK" : "en-US",
        interimResults: false, // we only need final phrases for commands
        continuous: false,     // end after final result
        // You can also set: requiresOnDeviceSpeechRecognition: false
        // and recordingOptions if you want persisted audio files
      });
    } catch (err) {
      Alert.alert("Error", "Could not start speech recognition.");
    }
  }, [ensurePermissions, language]);

  const stopListening = useCallback(async () => {
    try { await ExpoSpeechRecognitionModule.stop(); } catch {}
  }, []);

  // i18n + RTL handling
  const changeLanguage = (lang: "en" | "ur") => {
    dispatch(setLanguage(lang));
    i18n.locale = lang;
    if (lang === "ur") {
      I18nManager.forceRTL(true);
      I18nManager.allowRTL(true);
    } else {
      I18nManager.forceRTL(false);
      I18nManager.allowRTL(false);
    }
  };
  useEffect(() => { i18n.locale = language; }, [language]);
  const toggleLanguage = () => changeLanguage(language === "en" ? "ur" : "en");

  const micIcon = useMemo(() => (recognizing ? "mic" : "mic-outline"), [recognizing]);

  return (
    <View style={styles.container}>
      <TextBold style={styles.title}>{i18n.t("appName")}</TextBold>
      <Text style={styles.subtitle}>{i18n.t("subtitle")}</Text>
      <Text style={styles.description}>{i18n.t("description")}</Text>

      {/* Language Toggle */}
      <View style={styles.languageContainer}>
        <Text style={styles.label}>{i18n.t("selectLanguage")}</Text>
        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>English</Text>
          <Switch
            value={language === "ur"}
            onValueChange={toggleLanguage}
            thumbColor={language === "ur" ? "#A78BFA" : "#f4f3f4"}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
          />
          <Text style={styles.switchText}>اردو</Text>
        </View>
      </View>

      {/* Primary CTA */}
      <TouchableOpacity style={styles.button} onPress={checkConnection}>
        <TextBold style={styles.buttonText}>{i18n.t("getStarted")}</TextBold>
        <Ionicons name="arrow-forward" size={25} color="#fff" style={styles.icon} />
      </TouchableOpacity>

      {/* Voice Commands */}
      <TouchableOpacity
        style={[styles.button, recognizing && styles.buttonListening]}
        onPress={recognizing ? stopListening : startListening}
      >
        <Ionicons name={micIcon} size={25} color="#fff" style={styles.icon} />
        <TextBold style={styles.buttonText}>
          {recognizing ? "Listening…" : "Voice Commands"}
        </TextBold>
      </TouchableOpacity>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F6FF", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  title: { fontSize: 35, color: "#A78BFA", marginTop: 8, letterSpacing: 0.3 },
  subtitle: { fontSize: 19, fontWeight: "500", color: "#C4B5FD", textAlign: "center" },
  description: { marginTop: 90, fontSize: 18, fontWeight: "400", lineHeight: 24, color: "#374151", textAlign: "center", paddingHorizontal: 12 },
  languageContainer: { marginTop: 30, width: "100%", alignItems: "center", justifyContent: "center" },
  label: { fontSize: 16, color: "#374151", marginBottom: 8 },
  switchContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  switchText: { fontSize: 16, color: "#374151", marginHorizontal: 8 },
  button: {
    flexDirection: "row",
    width: screenWidth * 0.8,
    marginTop: 16,
    backgroundColor: "#A78BFA",
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    borderRadius: 14,
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === "ios" ? 0.3 : 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonListening: { backgroundColor: "#10B981" },
  buttonText: { color: "#FFFFFF", fontSize: 20, fontWeight: "600", letterSpacing: 0.8 },
  icon: { marginRight: 10 },
  instructionsText: { marginTop: 20, fontSize: 14, color: "#6B7280", textAlign: "center", fontStyle: "italic", paddingHorizontal: 20 },
});
