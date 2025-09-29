import { useAuth } from "@/src/auth/AuthContext";
import HeaderMenu from "@/src/components/HeaderMenu";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

const BRAND = "#289294";
const BLACK = "#000000";
const WHITE = "#FFFFFF";

const Header = () => {
  const auth = useAuth();
  const router = useRouter();

  const handleProfile = () => {
    router.push("/profile");
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still redirect to login even if logout fails
      router.replace("/login");
    }
  };

  // Optional: fallback initials avatar if you want a quick profile jump
  const initials = useMemo(() => {
    const name = auth?.user?.full_name || "";
    const p = name.trim().split(/\s+/);
    const f = p[0]?.[0] || "";
    const l = p.length > 1 ? p[p.length - 1][0] : "";
    return (f + l).toUpperCase() || "U";
  }, [auth?.user?.full_name]);

  return (
    <View className="w-full bg-white px-6 pt-12 pb-4 border-b border-gray-100">
      {/* Brand strip */}
      <View style={{ height: 3, backgroundColor: BRAND, borderRadius: 9999, width: 64, marginBottom: 10 }} />

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Image
            source={require("@/assets/images/logo.png")}
            className="w-40 h-10"
            resizeMode="contain"
          />
        </View>

        <View className="flex-row items-center">
          {/* Quick profile button (optional) */}
          <TouchableOpacity
            onPress={handleProfile}
            activeOpacity={0.8}
            style={{
              width: 34,
              height: 34,
              borderRadius: 9999,
              backgroundColor: BRAND,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
            accessibilityRole="button"
            accessibilityLabel="Open Profile"
          >
            <Text style={{ color: WHITE, fontSize: 12, fontWeight: "800" }}>{initials}</Text>
          </TouchableOpacity>

          {/* Existing menu with logout + profile */}
          <HeaderMenu onLogout={handleLogout} onProfile={handleProfile} />
        </View>
      </View>
    </View>
  );
};

const TabIcon = ({
  focused,
  title,
  icon,
}: {
  focused: boolean;
  title: string;
  icon: React.ReactNode;
}) => {
  return (
    <View style={{ width: 72 }} className="items-center justify-center">
      <View className={`w-10 h-10 rounded-full items-center justify-center mb-1 ${focused ? 'bg-[#E6FFFE]' : ''}`}>
        <Text className="text-xl">{icon}</Text>
      </View>
      <Text numberOfLines={1} style={{ fontSize: 11, width: 58, textAlign: 'center' }} className="font-medium">
        {title}
      </Text>
    </View>
  );
};

const TabsLayout = () => {
  return (
    <ProtectedRoute>
      <Header />
      <Tabs
        initialRouteName="attendance"
        screenOptions={{
          
          tabBarShowLabel: false,
          tabBarActiveTintColor: BRAND,
          tabBarInactiveTintColor: "#6B7280",
          tabBarStyle: {
          
            backgroundColor: 'white',
            borderTopWidth: 0,
            height: 80,
            paddingBottom: 18,
            paddingTop: 8,
            elevation: 4,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 8,
          },
          tabBarItemStyle: {
            height: 70,
            justifyContent: 'center'
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="attendance"
          options={{
            title: "Attendance",
            tabBarAccessibilityLabel: "Attendance",
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                focused={focused}
                title="Attendance"
                icon={
                  <MaterialCommunityIcons
                    name="clipboard-check-outline"
                    size={24}
                    color={focused ? BRAND : color}
                  />
                }
              />
            ),
          }}
        />

        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarAccessibilityLabel: "History",
            tabBarIcon: ({ focused, color }) => (
              <TabIcon
                focused={focused}
                title="History"
                icon={
                  <Ionicons
                    name="time-outline"
                    size={24}
                    color={focused ? BRAND : color}
                  />
                }
              />
            ),
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
};

export default TabsLayout;
