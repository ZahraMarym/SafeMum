import React, { useMemo, useState, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform, I18nManager, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useSelector, useDispatch } from "react-redux";
import * as Updates from "expo-updates";
import i18n from "@/i18n";
import { Text } from "@/components/Text";
import { TextBold } from "@/components/TextBold";
import { Video, ResizeMode } from "expo-av";
import { setLanguage } from "@/redux/slice/languageSlice";
import { useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import YoutubePlayer from "react-native-youtube-iframe";
import {
  calcPercentageHeight,
  calcPercentageWidth,
} from "@/lib/utils/dimensions";

const screenWidth = Dimensions.get("window").width;

// videos...
import t1en from "../../../assets/videos/eng/trimester1.mp4";
import t2en from "../../../assets/videos/eng/trimester2.mp4";
import t3en from "../../../assets/videos/eng/trimester3.mp4";
import t1ur from "../../../assets/videos/ur/trimester1.mp4";
import t2ur from "../../../assets/videos/ur/trimester2.mp4";
import t3ur from "../../../assets/videos/ur/trimester3.mp4";

const VIDEO_ASSETS: Record<"en" | "ur", Record<"1" | "2" | "3", any[]>> = {
  en: { "1": [t1en, t2en], "2": [t2en], "3": [t3en] },
  ur: { "1": [t1ur, t2ur], "2": [t2ur], "3": [t3ur] },
};

// ---------------- NEW: tabs ----------------
type TabKey = "trimester" | "monthly";

export default function HomeScreen() {
  const dispatch = useDispatch();
  const router = useRouter();

  const locale = useSelector((s: any) => s.language.language);
  const isRtlFromStore = useSelector((s: any) => s.language.textDirection === "rtl");

  const [tri, setTri] = useState<"1" | "2" | "3">("1");
  const [tab, setTab] = useState<TabKey>("trimester"); // NEW

  const currentAssets = useMemo(() => {
    const lang: "en" | "ur" = locale === "ur" ? "ur" : "en";
    return VIDEO_ASSETS[lang][tri];
  }, [locale, tri]);

  const styles = useMemo(() => createStyles(isRtlFromStore), [isRtlFromStore]);

  const changeLanguage = async (lang: "en" | "ur") => {
    dispatch(setLanguage(lang));
    i18n.locale = lang;
    const rtl = lang === "ur";
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
      try {
        await Updates.reloadAsync();
      } catch (e) {
        console.warn("Failed to reload for RTL change", e);
      }
    }
  };

  const L = useMemo(() => {
    const ur = locale === "ur";
    return {
      back: ur ? "واپس" : "Back",
      choose: ur ? "ٹرائمسٹر منتخب کریں" : "Select Trimester",
      t1: ur ? "پہلا ٹرائمسٹر" : "Trimester 1",
      t2: ur ? "دوسرا ٹرائمسٹر" : "Trimester 2",
      t3: ur ? "تیسرا ٹرائمسٹر" : "Trimester 3",
      langToggle: ur ? "English" : "اردو",
      // NEW: tab labels
      tabTrimester: ur ? "ٹرائمسٹر" : "Trimester",
      tabMonthly: ur ? "ماہانہ" : "Monthly",
      // NEW: headings
      headingMonthly: ur ? "ماہانہ" : "Monthly",
      headingWeekly: ur ? "Weekly" : "Weekly",
    };
  }, [locale]);

  // inside component
  const [hasInternet, setHasInternet] = useState<boolean | null>(null);

  // quick checker
  const checkConnectivity = async () => {
    const s = await NetInfo.fetch();
    // treat null as unknown (not offline). Only mark offline if explicitly false.
    const reachable = s.isConnected && s.isInternetReachable !== false;
    setHasInternet(reachable);
  };

  // watch tab changes; only monitor when Monthly is active
  useEffect(() => {
    if (tab !== "monthly") return;

    // initial check
    checkConnectivity();

    // live subscription
    const unsub = NetInfo.addEventListener((s) => {
      const reachable = s.isConnected && s.isInternetReachable !== false;
      setHasInternet(reachable);
    });
    return () => unsub();
  }, [tab]);


const extractYouTubeId = (url: string) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2];
    if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2];
    if (u.searchParams.get("v")) return u.searchParams.get("v")!;
  } catch {}
  // last-ditch regex
  const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return m ? m[1] : "";
};

// inside your component
const EN_SHORTS: string[] = [
  "https://www.youtube.com/watch?v=lRQd-HqWYFU&list=PLpesoaCsGYZKOjXKAKFdeOmU68GFm-SQC&index=3",
  "https://www.youtube.com/watch?v=XfDNmZATjlM&list=PLpesoaCsGYZKOjXKAKFdeOmU68GFm-SQC&index=2",
  "https://www.youtube.com/watch?v=hxf0dMd7Qek&list=PLpesoaCsGYZKOjXKAKFdeOmU68GFm-SQC&index=1",
  "https://www.youtube.com/watch?v=qN8TW1JyQSk",
  "https://www.youtube.com/watch?v=zFAA60qtW0k&t=3s",
  "https://www.youtube.com/watch?v=0vmylvXZUSI",
  "https://www.youtube.com/watch?v=UIMYUtWT2-A",
  "https://www.youtube.com/watch?v=QTkGvrsoKWI",
];

const UR_SHORTS: string[] = [
  "https://www.youtube.com/watch?v=ZAFJK7CS2xI&list=PLPUuG-pf8QWk42vOzTejTXEIGmFcucP-G&index=2",
  "https://www.youtube.com/watch?v=x0Z1ULr4lfw&list=PLPUuG-pf8QWk42vOzTejTXEIGmFcucP-G&index=3",
  "https://www.youtube.com/watch?v=b9igaMX44ps&list=PLPUuG-pf8QWk42vOzTejTXEIGmFcucP-G&index=4",
  "https://www.youtube.com/watch?v=ZwdBwvjKRaU&list=PLPUuG-pf8QWk42vOzTejTXEIGmFcucP-G&index=5",
  "https://www.youtube.com/watch?v=4IrmLmV9jrk&list=PLPUuG-pf8QWk42vOzTejTXEIGmFcucP-G&index=6",
  "https://www.youtube.com/watch?v=4QmtQD19Eng&list=PLPUuG-pf8QWk42vOzTejTXEIGmFcucP-G&index=7",
  "https://www.youtube.com/watch?v=YQqDRBYFrgk&list=PLPUuG-pf8QWk42vOzTejTXEIGmFcucP-G&index=8",
  "https://www.youtube.com/watch?v=aZ2C7bl3aCY&list=PLPUuG-pf8QWk42vOzTejTXEIGmFcucP-G&index=9",
  "https://www.youtube.com/watch?v=-Pgl4pYJqKQ&list=PLPUuG-pf8QWk42vOzTejTXEIGmFcucP-G&index=10",
];

// Small card component that computes a proper 9:16 height for Shorts
const YouTubeCard: React.FC<{ videoId: string }> = ({ videoId }) => {
  const [h, setH] = React.useState(0);
  return (
    <View style={styles.card}>
      <View
        style={{ width: "100%" }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setH(Math.round((w * 9) / 16)); // Shorts: vertical 9:16 ⇒ height = w * 16/9
        }}
      >
        <YoutubePlayer
          height={h || 1}           // must be > 0
          width={"100%"}
          videoId={videoId}
          play={false}
          initialPlayerParams={{ modestbranding: true, playsinline: true }}
          webViewStyle={{ backgroundColor: "black" }}
        />
      </View>
    </View>
  );
};;


const videosForLang = React.useMemo(
  () => (locale === "ur" ? UR_SHORTS : EN_SHORTS),
  [locale]
);


  return (
    <View style={styles.container}>
      {/* Back */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name={"chevron-back"} size={24} color="black" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingTop: 100, paddingBottom: 40 }}>
        {/* Language toggle */}
        <TouchableOpacity onPress={() => changeLanguage(locale === "ur" ? "en" : "ur")} style={styles.langBtn}>
          <Ionicons name="language" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.langBtnText}>{L.langToggle}</Text>
        </TouchableOpacity>

        {/* ---------------- NEW: Top Tabs ---------------- */}
        <View style={[styles.tabs, { flexDirection: isRtlFromStore ? "row-reverse" : "row" }]}>
          {(
            [
              { key: "trimester", label: L.tabTrimester },
              { key: "monthly", label: L.tabMonthly },
            ] as { key: TabKey; label: string }[]
          ).map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity key={t.key} style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={() => setTab(t.key)}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ---------------- Tab Content ---------------- */}
        {tab === "trimester" && (
          <>
            <TextBold style={styles.title}>{L.choose}</TextBold>

      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={tri}
          onValueChange={(v) => setTri(v)}
          mode="dropdown"
          style={[
            styles.picker,
            isRtlFromStore ? styles.pickerRtl : styles.pickerLtr,
          ]}
          dropdownIconColor="#6B7280"
        >
          <Picker.Item label={L.t1} value="1" />
          <Picker.Item label={L.t2} value="2" />
          <Picker.Item label={L.t3} value="3" />
        </Picker>
      </View>


            {/* Video(s) */}
            <View style={styles.videoCard}>
              {currentAssets.map((asset, index) => (
                <Video
                  key={index}
                  style={styles.video}
                  source={asset}
                  useNativeControls
                  shouldPlay={index === 0}
                  resizeMode={ResizeMode.CONTAIN}
                />
              ))}
            </View>
          </>
        )}

  {tab === "monthly" && (
    <>
      <TextBold style={[styles.title, { textAlign: "center" }]}>{L.headingMonthly}</TextBold>

      {hasInternet === false ? (
        <View style={styles.offlineCard}>
          <Text style={styles.offlineText}>
            {locale === "ur" ? "آپ کے پاس انٹرنیٹ کنیکشن نہیں ہے" : "You don't have an internet connection"}
          </Text>
          <TouchableOpacity onPress={checkConnectivity} style={styles.retryBtn}>
            <Text style={styles.retryText}>{locale === "ur" ? "دوبارہ کوشش کریں" : "Try again"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Render 9 language-specific videos
        <View>
          {videosForLang.map((idOrUrl) => (
            <YouTubeCard key={idOrUrl} videoId={extractYouTubeId(idOrUrl)} />
          ))}

        </View>
      )}
    </>
  )}



      </ScrollView>
    </View>
  );
}

function createStyles(isRTL: boolean) {
  return StyleSheet.create({
       container: {
         flex: 1,
         backgroundColor: "#F6F6FF",
         paddingHorizontal: calcPercentageWidth(6),
         direction: isRTL ? "rtl" : "ltr",
       },

       backButton: {
         position: "absolute",
         top: calcPercentageHeight(7),
         left: isRTL ? undefined : calcPercentageWidth(6),
         right: isRTL ? calcPercentageWidth(6) : undefined,
         zIndex: 10,
       },

       title: {
         fontSize: calcPercentageWidth(5.6),
         color: "#374151",
         marginBottom: calcPercentageHeight(1.5),
         textAlign: "center",
         fontWeight: "bold",
       },

       langBtn: {
         alignSelf: "center",
         flexDirection: "row",
         backgroundColor: "#A78BFA",
         paddingHorizontal: calcPercentageWidth(3.5),
         paddingVertical: calcPercentageHeight(1),
         borderRadius: calcPercentageWidth(3),
         marginBottom: calcPercentageHeight(2),
       },

       langBtnText: {
         color: "#fff",
         fontSize: calcPercentageWidth(3.8),
         fontWeight: "500",
       },

       // -------- tabs
       tabs: {
         backgroundColor: "#ECEBFF",
         borderRadius: calcPercentageWidth(3),
         padding: calcPercentageWidth(1.2),
         marginBottom: calcPercentageHeight(2),
         flexDirection: "row",
       },

       tabBtn: {
         flex: 1,
         paddingVertical: calcPercentageHeight(1.3),
         borderRadius: calcPercentageWidth(3),
         alignItems: "center",
         justifyContent: "center",
       },

       tabBtnActive: {
         backgroundColor: "#7C3AED",
       },

       tabText: {
         fontSize: calcPercentageWidth(3.5),
         color: "#4B5563",
         fontWeight: "600",
       },

       tabTextActive: {
         color: "#fff",
       },

       // -------- Picker
       pickerWrap: {
         height: calcPercentageHeight(7),
         borderWidth: 1,
         borderColor: "#E5E7EB",
         borderRadius: calcPercentageWidth(3),
         overflow: "hidden",
         backgroundColor: "#fff",
       },

       picker: {
         height: calcPercentageHeight(6.8),
         color: "#111827",
         width: "100%",
         paddingHorizontal: calcPercentageWidth(3),
       },

       pickerLtr: Platform.select({
         ios: { textAlign: "left" },
         android: { writingDirection: "ltr" },
       }),

       pickerRtl: Platform.select({
         ios: { textAlign: "right" },
         android: { writingDirection: "rtl" },
       }),

       // -------- Video
       videoCard: {
         marginTop: calcPercentageHeight(2),
         borderRadius: calcPercentageWidth(4),
         padding: calcPercentageWidth(5),
         overflow: "hidden",
         backgroundColor: "#fff",
         alignItems: "center",
         justifyContent: "center",
         ...Platform.select({
           ios: {
             shadowColor: "#000",
             shadowOpacity: 0.2,
             shadowRadius: 6,
             shadowOffset: { width: 0, height: 4 },
           },
           android: { elevation: 6 },
         }),
       },

       video: {
         width: screenWidth - calcPercentageWidth(12),
         aspectRatio: 16 / 9,
         margin: calcPercentageHeight(1.5),
         backgroundColor: "#000",
         borderRadius: calcPercentageWidth(3),
       },

       // -------- Card
       card: {
         marginTop: calcPercentageHeight(1.5),
         backgroundColor: "#fff",
         borderRadius: calcPercentageWidth(3),
         padding: calcPercentageWidth(4),
         ...Platform.select({
           ios: {
             shadowColor: "#000",
             shadowOpacity: 0.1,
             shadowRadius: 4,
             shadowOffset: { width: 0, height: 2 },
           },
           android: { elevation: 3 },
         }),
       },

       cardText: {
         color: "#111827",
         fontSize: calcPercentageWidth(3.5),
         textAlign: "center",
       },

       // -------- Offline Card
       offlineCard: {
         marginTop: calcPercentageHeight(1.5),
         backgroundColor: "#fff",
         borderRadius: calcPercentageWidth(3),
         padding: calcPercentageWidth(4),
         alignItems: "center",
         ...Platform.select({
           ios: {
             shadowColor: "#000",
             shadowOpacity: 0.1,
             shadowRadius: 4,
             shadowOffset: { width: 0, height: 2 },
           },
           android: { elevation: 3 },
         }),
       },

       offlineText: {
         color: "#B91C1C",
         fontSize: calcPercentageWidth(3.5),
         textAlign: "center",
         marginBottom: calcPercentageHeight(1),
         fontWeight: "500",
       },

       retryBtn: {
         backgroundColor: "#7C3AED",
         paddingHorizontal: calcPercentageWidth(3),
         paddingVertical: calcPercentageHeight(1),
         borderRadius: calcPercentageWidth(2.2),
       },

       retryText: {
         color: "#fff",
         fontWeight: "600",
         fontSize: calcPercentageWidth(3.8),
       },
  });
}
