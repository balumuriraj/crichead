import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Trophy, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '@crichead/ui/mobile';

const TAB_CONFIG = [
  { name: 'index', label: 'Home', Icon: Home },
  { name: 'tournaments', label: 'Tournaments', Icon: Trophy },
  { name: 'profile', label: 'Profile', Icon: User },
] as const;

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
      {TAB_CONFIG.map((tab, index) => {
        const isFocused = state.index === index;
        const { Icon, label } = tab;

        return (
          <TouchableOpacity
            key={tab.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={label}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: state.routes[index]?.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(state.routes[index]!.name);
              }
            }}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isFocused && styles.iconContainerActive]}>
              <Icon
                size={22}
                color={isFocused ? Colors.electricGreen : Colors.gray500}
                strokeWidth={isFocused ? 2.5 : 1.8}
              />
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tournaments" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.gray800,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: Colors.electricGreen + '1A',
  },
  tabLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.gray500,
  },
  tabLabelActive: {
    color: Colors.electricGreen,
    fontWeight: Typography.fontWeight.semibold,
  },
});
