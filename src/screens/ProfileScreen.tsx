import { useAuth } from "@/src/auth/AuthContext";
import HeaderMenu from "@/src/components/HeaderMenu";
import React, { useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const BRAND = "#289294";
const BLACK = "#000000";
const WHITE = "#FFFFFF";

const ShadowCard: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => (
  <View
    style={[
      {
        backgroundColor: WHITE,
        borderRadius: 16,
        shadowColor: BLACK,
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      },
      style,
    ]}
  >
    {children}
  </View>
);

const Badge = ({ label, tone = "default" as "default" | "success" | "muted" }) => {
  const styles = {
    default: { bg: "#F3F4F6", fg: "#111827" },
    success: { bg: "#DCFCE7", fg: "#065F46" },
    muted: { bg: "#E5E7EB", fg: "#374151" },
  }[tone];

  return (
    <View
      style={{
        backgroundColor: styles.bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 9999,
      }}
    >
      <Text style={{ color: styles.fg, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
};

const InfoRow = ({ label, value }: { label: string; value?: string | number | boolean | null }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>{label}</Text>
    <Text style={{ fontSize: 15, color: "#111827" }}>
      {value === undefined || value === null || value === "" ? "—" : String(value)}
    </Text>
  </View>
);

const formatDate = (value?: string) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value; // fallback to raw text if not a date
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
};

const ProfileScreen = () => {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const { user, logout, loading = false, error, refresh } = auth;

  const nameInitials = useMemo(() => {
    const name = user?.full_name || "";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || "U";
  }, [user?.full_name]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WHITE }} edges={["bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* Top bar */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: WHITE,
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "800", color: BLACK }}>Profile</Text>
        <HeaderMenu onLogout={logout} />
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 28 + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={!!loading} onRefresh={refresh} tintColor={BRAND} />
        }
      >
        {/* Header card */}
        <ShadowCard style={{ padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Avatar */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 9999,
                backgroundColor: BRAND,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 14,
              }}
            >
              <Text style={{ color: WHITE, fontWeight: "800", fontSize: 22 }}>{nameInitials}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#0F172A" }}>
                {user?.full_name || "User"}
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                {user?.email || "—"}
              </Text>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <Badge
                  label={user?.is_staff ? "Staff" : "Non-Staff"}
                  tone={user?.is_staff ? "success" : "muted"}
                />
                <Badge
                  label={user?.is_superuser ? "Superuser" : "Standard"}
                  tone={user?.is_superuser ? "success" : "muted"}
                />
              </View>
            </View>

            {/* Edit / Refresh */}
            <View style={{ alignItems: "flex-end", gap: 10 }}>
              <TouchableOpacity
                onPress={refresh}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: "#F3F4F6",
                }}
              >
                <Text style={{ fontWeight: "700", color: "#111827" }}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ShadowCard>

        {/* Quick stats / role card */}
        <ShadowCard style={{ padding: 16, borderLeftWidth: 5, borderLeftColor: BRAND, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>Job Title</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 4 }}>
                {user?.job_title || "—"}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#E5E7EB" }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>Department</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 4 }}>
                {user?.department || "—"}
              </Text>
            </View>
          </View>
        </ShadowCard>

        {/* Details */}
        <ShadowCard style={{ padding: 16 }}>
          <View
            style={{
              paddingBottom: 12,
              marginBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#0F172A" }}>Employee Details</Text>
            <View
              style={{
                backgroundColor: BRAND,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: WHITE, fontWeight: "700", fontSize: 12 }}>Verified</Text>
            </View>
          </View>

          <InfoRow label="Date of Joining" value={formatDate(user?.date_of_joining)} />
          <InfoRow label="Employment Type" value={user?.employment_type} />
          <InfoRow label="Payout Terms" value={user?.payout_terms} />
          <InfoRow label="Address" value={user?.address} />
          <InfoRow label="Gender" value={user?.gender} />
          <InfoRow label="Manager" value={user?.manager_name} />
        </ShadowCard>

        {/* Empty & Error States */}
        {!loading && !user && !error && (
          <View style={{ marginTop: 16 }}>
            <ShadowCard style={{ padding: 16, borderLeftWidth: 5, borderLeftColor: "#F59E0B" }}>
              <Text style={{ color: "#92400E", fontWeight: "700", marginBottom: 6 }}>
                No user data
              </Text>
              <Text style={{ color: "#92400E" }}>
                Please refresh or re-authenticate from the menu.
              </Text>
            </ShadowCard>
          </View>
        )}

        {error && (
          <View style={{ marginTop: 16 }}>
            <ShadowCard style={{ padding: 16, borderLeftWidth: 5, borderLeftColor: "#EF4444" }}>
              <Text style={{ color: "#7F1D1D", fontWeight: "700", marginBottom: 6 }}>
                Something went wrong
              </Text>
              <Text style={{ color: "#7F1D1D", marginBottom: 10 }}>
                {String(error)}
              </Text>
              <TouchableOpacity
                onPress={refresh}
                style={{
                  backgroundColor: "#FEE2E2",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: "#991B1B", fontWeight: "700" }}>Try Again</Text>
              </TouchableOpacity>
            </ShadowCard>
          </View>
        )}
      </ScrollView>

      {/* Sticky footer CTA (optional) */}
      <View
        style={{
          padding: 14,
          paddingBottom: 14 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
          backgroundColor: WHITE,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {}}
          style={{
            backgroundColor: BRAND,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: WHITE, fontWeight: "800", fontSize: 15 }}>
            Update Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ProfileScreen;
