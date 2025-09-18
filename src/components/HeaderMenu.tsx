import React, { useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface Props {
  onLogout: () => void;
  onProfile?: () => void;
}

const BRAND = "#289294";
const WHITE = "#FFFFFF";
const BLACK = "#111827";

const HeaderMenu = ({ onLogout, onProfile }: Props) => {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      {/* Trigger button */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          padding: 8,
          borderRadius: 9999,
          backgroundColor: `${BRAND}15`,
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 18 }}>👤</Text>
      </TouchableOpacity>

      {/* Modal dropdown */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <TouchableWithoutFeedback onPress={close}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.25)", // semi-dimmed
              alignItems: "flex-end",
            }}
          >
            {/* Dropdown container */}
            <Pressable
              style={{
                marginTop: 70, // distance from top
                marginRight: 16, // align to top-right
                backgroundColor: WHITE,
                borderRadius: 12,
                paddingVertical: 8,
                width: 180,
                shadowColor: BLACK,
                shadowOpacity: 0.15,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
            >
              <TouchableOpacity
                style={{ paddingVertical: 12, paddingHorizontal: 16 }}
                onPress={() => {
                  close();
                  onProfile?.();
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: BRAND }}>
                  Profile
                </Text>
              </TouchableOpacity>

              <View
                style={{ height: 1, backgroundColor: "#E5E7EB", marginHorizontal: 8 }}
              />

              <TouchableOpacity
                style={{ paddingVertical: 12, paddingHorizontal: 16 }}
                onPress={() => {
                  close();
                  onLogout();
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#DC2626" }}>
                  Logout
                </Text>
              </TouchableOpacity>

              <View
                style={{ height: 1, backgroundColor: "#E5E7EB", marginHorizontal: 8 }}
              />

              <TouchableOpacity
                style={{ paddingVertical: 12, paddingHorizontal: 16 }}
                onPress={close}
              >
                <Text style={{ fontSize: 14, color: "#6B7280" }}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default HeaderMenu;
