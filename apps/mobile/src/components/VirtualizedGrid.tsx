import type { ReactElement, ReactNode } from "react";
import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radii, space, useTheme, useThemeStyles, type ThemeColours } from "../theme";

type VirtualizedGridProps<T> = {
  data: T[];
  columns: 1 | 2 | 3;
  keyExtractor: (item: T) => string;
  renderTile: (item: T, width: number) => ReactElement;
  header?: ReactNode;
  empty?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  roundedList?: boolean;
};

export function VirtualizedGrid<T>({ data, columns, keyExtractor, renderTile, header, empty, refreshing, onRefresh, roundedList = false }: VirtualizedGridProps<T>) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const styles = useThemeStyles(createStyles);
  const gap = 3;
  const contentWidth = Math.min(width, 720) - space.md * 2;
  const tileWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns);

  return (
    <FlatList
      data={data}
      key={`columns-${columns}`}
      keyExtractor={keyExtractor}
      numColumns={columns}
      renderItem={({ item, index }) => <View style={{ width: tileWidth, marginBottom: gap, ...(roundedList && columns === 1 ? { overflow: "hidden" as const, borderTopLeftRadius: index === 0 ? radii.surface : 0, borderTopRightRadius: index === 0 ? radii.surface : 0, borderBottomLeftRadius: index === data.length - 1 ? radii.surface : 0, borderBottomRightRadius: index === data.length - 1 ? radii.surface : 0 } : {}) }}>{renderTile(item, tileWidth)}</View>}
      columnWrapperStyle={columns > 1 ? styles.row : undefined}
      ListHeaderComponent={header ? <View style={styles.header}>{header}</View> : null}
      ListEmptyComponent={empty ? <View style={styles.empty}>{empty}</View> : null}
      contentContainerStyle={[styles.content, { paddingBottom: 112 + insets.bottom }]}
      initialNumToRender={columns * 4}
      maxToRenderPerBatch={columns * 3}
      updateCellsBatchingPeriod={40}
      windowSize={7}
      removeClippedSubviews
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

const createStyles = (colours: ThemeColours) => StyleSheet.create({
  content: { width: "100%", maxWidth: 720, flexGrow: 1, alignSelf: "center", padding: space.md, backgroundColor: colours.background },
  header: { gap: space.md, marginBottom: space.md },
  row: { gap: 3 },
  empty: { flex: 1 }
});
