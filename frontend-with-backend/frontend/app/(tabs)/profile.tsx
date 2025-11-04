import React, { useEffect, useState } from "react";
import {
   StyleSheet,
   ScrollView,
   TouchableOpacity,
   View,
   Modal,
   Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { notifyAvatar } from "@/lib/avatarEvents";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type ModalType = "help" | "about" | "logout" | "info" | "comingSoon" | null;

export default function ProfileScreen() {
   const { theme } = useTheme();
   const { user, logout } = useAuth();
   const insets = useSafeAreaInsets();
   const router = useRouter();

   const [avatarUri, setAvatarUri] = useState<string | null>(null);

   const [modalVisible, setModalVisible] = useState(false);
   const [modalType, setModalType] = useState<ModalType>(null);
   const [modalTitle, setModalTitle] = useState("");
   const [modalMessage, setModalMessage] = useState("");

   // Load avatar for this user
   useEffect(() => {
      const loadAvatar = async () => {
         try {
            if (!user) {
               setAvatarUri(null);
               return;
            }
            const key = user.email
               ? `avatar_${user.email}`
               : "avatar_default_user";
            const stored = await AsyncStorage.getItem(key);
            setAvatarUri(stored || null);
         } catch (e) {
            console.warn("Failed to load avatar:", e);
         }
      };

      loadAvatar();
   }, [user]);

   const openModal = (type: ModalType, title: string, message: string) => {
      setModalType(type);
      setModalTitle(title);
      setModalMessage(message);
      setModalVisible(true);
   };

   const closeModal = () => {
      setModalVisible(false);
      setModalType(null);
   };

   const handleMenuPress = (item: string) => {
      if (item === "Settings") {
         router.push("/settings");
      } else if (
         item === "Reading Statistics" ||
         item === "Favorites" ||
         item === "Export Data"
      ) {
         openModal(
            "comingSoon",
            "Feature coming soon",
            "This feature is currently being built.\n\nCheck back again in a future update!"
         );
      } else if (item === "Help & Support") {
         openModal(
            "help",
            "Help Center",
            "Need help? Contact our support team for assistance."
         );
      } else if (item === "About") {
         openModal(
            "about",
            "About Easy Read",
            "Easy Read Toolkit v1.0.0\n\nA powerful tool for making reading easier and more accessible."
         );
      }
   };

   const handleLogout = () => {
      openModal("logout", "Logout", "Are you sure you want to logout?");
   };

   const pickAvatar = async () => {
      try {
         const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
         if (status !== "granted") {
            openModal(
               "info",
               "Permission Needed",
               "Please allow access to your photos to set a profile picture."
            );
            return;
         }

         const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes:
               (ImagePicker as any).MediaType?.Images ??
               ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
         });

         if (result.canceled) return;

         const asset = result.assets[0];
         if (!asset?.uri) return;

         const uri = asset.uri;
         setAvatarUri(uri);

         const key = user?.email
            ? `avatar_${user.email}`
            : "avatar_default_user";
         await AsyncStorage.setItem(key, uri);

         notifyAvatar(uri);
      } catch (e) {
         console.warn("Avatar pick error:", e);
         openModal("info", "Error", "Could not update profile picture.");
      }
   };

   const profileItems: {
      title: string;
      icon: IoniconName;
      subtitle: string;
   }[] = [
      {
         title: "Reading Statistics",
         icon: "stats-chart-outline",
         subtitle: "View your reading progress",
      },
      {
         title: "Favorites",
         icon: "heart-outline",
         subtitle: "Your saved documents",
      },
      {
         title: "Export Data",
         icon: "cloud-upload-outline",
         subtitle: "Backup your documents",
      },
      {
         title: "Settings",
         icon: "settings-outline",
         subtitle: "App preferences",
      },
      {
         title: "Help & Support",
         icon: "help-circle-outline",
         subtitle: "Get help",
      },
      {
         title: "About",
         icon: "information-circle-outline",
         subtitle: "App information",
      },
   ];

   const renderModalIcon = () => {
      if (modalType === "logout") {
         return "log-out-outline";
      }
      if (modalType === "help") {
         return "help-circle-outline";
      }
      if (modalType === "comingSoon") {
         return "time-outline";
      }
      return "information-circle-outline";
   };

   return (
      <ThemedView
         style={[
            styles.container,
            { backgroundColor: Colors[theme].background },
         ]}
      >
         <ThemedView
            style={[
               styles.header,
               {
                  backgroundColor: Colors[theme].headerBackground,
                  paddingTop: insets.top + 20,
               },
            ]}
         >
            <ThemedText style={styles.headerTitle}>Profile</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
               Manage your account
            </ThemedText>
         </ThemedView>

         <ScrollView
            style={[
               styles.scrollView,
               { backgroundColor: Colors[theme].background },
            ]}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            showsVerticalScrollIndicator={false}
         >
            {/* User Info Section */}
            <ThemedView style={styles.userSection}>
               <TouchableOpacity
                  style={styles.avatar}
                  onPress={pickAvatar}
                  activeOpacity={0.8}
               >
                  {avatarUri ? (
                     <Image
                        source={{ uri: avatarUri }}
                        style={styles.avatarImage}
                        contentFit="cover"
                     />
                  ) : (
                     <Ionicons name="person" size={40} color="#fff" />
                  )}
               </TouchableOpacity>

               <ThemedText style={styles.userName}>{user?.name}</ThemedText>
               <ThemedText style={styles.userEmail}>{user?.email}</ThemedText>

               <ThemedText style={styles.memberSince}>
                  Member since{" "}
                  {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
               </ThemedText>
            </ThemedView>

            {/* Menu Items */}
            <ThemedView style={styles.menuSection}>
               {profileItems.map((item, index) => (
                  <TouchableOpacity
                     key={index}
                     style={[
                        styles.menuItem,
                        {
                           backgroundColor: Colors[theme].surface,
                           borderColor: Colors[theme].border,
                           overflow: "hidden",
                        },
                     ]}
                     onPress={() => handleMenuPress(item.title)}
                  >
                     <ThemedView
                        style={[
                           styles.menuIcon,
                           { backgroundColor: Colors[theme].surface },
                        ]}
                     >
                        <Ionicons
                           name={item.icon}
                           size={24}
                           color={Colors[theme].accent}
                        />
                     </ThemedView>

                     <ThemedView style={styles.menuInfo}>
                        <ThemedText style={styles.menuTitle}>
                           {item.title}
                        </ThemedText>
                        <ThemedText
                           style={[
                              styles.menuSubtitle,
                              { color: Colors[theme].textSecondary },
                           ]}
                        >
                           {item.subtitle}
                        </ThemedText>
                     </ThemedView>

                     <Ionicons
                        name="chevron-forward-outline"
                        size={20}
                        color={Colors[theme].icon}
                     />
                  </TouchableOpacity>
               ))}

               {/* Logout Button */}
               <TouchableOpacity
                  style={[
                     styles.logoutButton,
                     {
                        backgroundColor: Colors[theme].buttonBackground,
                        justifyContent: "center",
                        alignItems: "center",
                     },
                  ]}
                  onPress={handleLogout}
                  activeOpacity={0.85}
               >
                  <ThemedText style={styles.logoutText}>Logout</ThemedText>
               </TouchableOpacity>
            </ThemedView>
         </ScrollView>

         {/* Themed Modal */}
         <Modal
            visible={modalVisible}
            animationType="fade"
            transparent
            onRequestClose={closeModal}
         >
            <View style={styles.modalOverlay}>
               <ThemedView
                  style={[
                     styles.modalContainer,
                     { backgroundColor: Colors[theme].surface },
                  ]}
               >
                  <Ionicons
                     name={renderModalIcon()}
                     size={40}
                     color={Colors[theme].accent}
                     style={{ marginBottom: 8 }}
                  />
                  <ThemedText
                     style={[styles.modalTitle, { color: Colors[theme].text }]}
                  >
                     {modalTitle}
                  </ThemedText>
                  <ThemedText
                     style={[
                        styles.modalMessage,
                        { color: Colors[theme].textSecondary },
                     ]}
                  >
                     {modalMessage}
                  </ThemedText>

                  <View style={styles.modalButtons}>
                     {modalType === "help" && (
                        <>
                           <TouchableOpacity
                              style={[
                                 styles.modalButton,
                                 { backgroundColor: Colors[theme].accent },
                              ]}
                              onPress={() => {
                                 closeModal();
                                 Linking.openURL("mailto:support@easyread.com");
                              }}
                           >
                              <ThemedText style={styles.modalButtonText}>
                                 Contact support
                              </ThemedText>
                           </TouchableOpacity>

                           <TouchableOpacity
                              style={[
                                 styles.modalButton,
                                 {
                                    backgroundColor: "transparent",
                                    borderWidth: 1,
                                    borderColor: Colors[theme].border,
                                 },
                              ]}
                              onPress={closeModal}
                           >
                              <ThemedText
                                 style={[
                                    styles.modalButtonText,
                                    { color: Colors[theme].textSecondary },
                                 ]}
                              >
                                 Cancel
                              </ThemedText>
                           </TouchableOpacity>
                        </>
                     )}

                     {modalType === "logout" && (
                        <>
                           <TouchableOpacity
                              style={[
                                 styles.modalButton,
                                 { backgroundColor: Colors[theme].accent },
                              ]}
                              onPress={async () => {
                                 closeModal();
                                 await logout();
                              }}
                           >
                              <ThemedText style={styles.modalButtonText}>
                                 Logout
                              </ThemedText>
                           </TouchableOpacity>

                           <TouchableOpacity
                              style={[
                                 styles.modalButton,
                                 {
                                    backgroundColor: "transparent",
                                    borderWidth: 1,
                                    borderColor: Colors[theme].border,
                                 },
                              ]}
                              onPress={closeModal}
                           >
                              <ThemedText
                                 style={[
                                    styles.modalButtonText,
                                    { color: Colors[theme].textSecondary },
                                 ]}
                              >
                                 Cancel
                              </ThemedText>
                           </TouchableOpacity>
                        </>
                     )}

                     {(modalType === "about" ||
                        modalType === "info" ||
                        modalType === "comingSoon") && (
                        <TouchableOpacity
                           style={[
                              styles.modalButton,
                              {
                                 backgroundColor: Colors[theme].accent,
                                 alignSelf: "stretch",
                              },
                           ]}
                           onPress={closeModal}
                        >
                           <ThemedText style={styles.modalButtonText}>
                              OK
                           </ThemedText>
                        </TouchableOpacity>
                     )}
                  </View>
               </ThemedView>
            </View>
         </Modal>
      </ThemedView>
   );
}

const styles = StyleSheet.create({
   container: { flex: 1 },
   header: { paddingBottom: 24, paddingHorizontal: 20 },
   headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#fff",
      marginBottom: 4,
   },
   headerSubtitle: { fontSize: 16, color: "#fff", opacity: 0.8 },
   scrollView: { flex: 1, paddingHorizontal: 20 },
   userSection: { alignItems: "center", paddingVertical: 32, marginBottom: 24 },
   avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "#961A36",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
      overflow: "hidden",
   },
   avatarImage: { width: 80, height: 80, borderRadius: 40 },
   userName: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
   userEmail: { fontSize: 16, opacity: 0.6, marginBottom: 8 },
   memberSince: { fontSize: 14, opacity: 0.5 },
   menuSection: { marginBottom: 32, paddingHorizontal: 20 },
   menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
   },
   menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
   },
   menuInfo: { flex: 1 },
   menuTitle: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
   menuSubtitle: { fontSize: 14, opacity: 0.6 },
   logoutButton: { marginTop: 16, borderRadius: 12, paddingVertical: 16 },
   logoutText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
   },

   // Modal styles
   modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
      padding: 20,
   },
   modalContainer: {
      width: "100%",
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
   },
   modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 8,
      textAlign: "center",
   },
   modalMessage: {
      fontSize: 15,
      textAlign: "center",
      marginBottom: 20,
   },
   modalButtons: {
      flexDirection: "row",
      gap: 12,
      alignSelf: "stretch",
      justifyContent: "center",
   },
   modalButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
   },
   modalButtonText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: 16,
      textAlign: "center",
   },
});
