import { useAuth } from "@/src/auth/AuthContext";
import HeaderMenu from "@/src/components/HeaderMenu";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React, { useMemo, useCallback } from "react";
import { Image, Text, TouchableOpacity, View, Platform } from "react-native";

const BRAND = "#289294";
const BLACK = "#000000";
const WHITE = "#FFFFFF";

const Header = () => {
  const auth = useAuth();
  const router = useRouter();

  const handleProfile = useCallback(() => {
    try {
      router.push("/profile");
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }, [router]);

  const handleLogout = useCallback(async () => {
    try {
      await auth.logout();
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still redirect to login even if logout fails
      router.replace("/login");
    }
  }, [auth, router]);

  // Optional: fallback initials avatar if you want a quick profile jump
  const initials = useMemo(() => {
    const name = auth?.user?.full_name || "";
    const p = name.trim().split(/\s+/);
    const f = p[0]?.[0] || "";
    const l = p.length > 1 ? p[p.length - 1][0] : "";
    return (f + l).toUpperCase() || "U";
  }, [auth?.user?.full_name]);

  return (
    <View className="w-full bg-white px-6 pt-4 border-b border-gray-100">
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
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center',
      paddingVertical: 4,
      borderRadius: 18,
      
      minWidth: 80,
      transform: [{ scale: focused ? 1.02 : 1 }]
    }}>
      <View style={{
        marginBottom: 4,
        backgroundColor: focused ? '#E6FFFE' : 'transparent' ,
        transform: [{ scale: focused ? 1.1 : 1 }]
      }}>
        {icon}
      </View>
      <Text 
        numberOfLines={1} 
        style={{ 
          fontSize: focused ? 12 : 11, 
          fontWeight: focused ? '600' : '500',
          color: focused ? BRAND : '#6B7280',
          textAlign: 'center'
        }}
      >
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
            height: Platform.OS === 'ios' ? 85 : 70,
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
            paddingTop: 12,
            paddingHorizontal: 16,
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,

            position: 'absolute',
          },
          tabBarItemStyle: {
            paddingVertical: 4,
            justifyContent: 'center',
            alignItems: 'center'
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
