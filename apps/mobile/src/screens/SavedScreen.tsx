import { useState } from "react";
import { useWindowDimensions } from "react-native";
import { ExplorePlaceTile } from "../components/PlaceCards";
import { ActionButton, CacheNotice, Eyebrow, Notice, Skeleton, Title } from "../components/Ui";
import { VirtualizedGrid } from "../components/VirtualizedGrid";
import { usePlaces } from "../state/PlacesContext";

export function SavedScreen() {
  const { places, savedPlaceIds, isSaved, toggleSaved, loading, refreshing, error, dataSource, lastUpdatedAt, cacheExpired, refresh } = usePlaces();
  const saved = places.filter((place) => savedPlaceIds.includes(place.id));
  const { width } = useWindowDimensions();
  const [grid, setGrid] = useState(false);
  const layout = width >= 768 && grid ? "grid" : "list";
  const empty = loading && !places.length
    ? <><Skeleton /><Skeleton /></>
    : error && !places.length
      ? <Notice title="Could not load saved places" message={error} actionLabel="Try again" onAction={() => void refresh()} />
      : <Notice title="Nothing saved yet" message="Save a place to keep its live checks close." />;

  return (
    <VirtualizedGrid
      data={saved}
      columns={layout === "grid" ? 3 : 1}
      roundedList={layout === "list"}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      empty={empty}
      header={<><Eyebrow>Saved</Eyebrow><Title>Your places.</Title>{width >= 768 ? <ActionButton label={grid ? "Show list" : "Show grid"} tone="light" onPress={() => setGrid(!grid)}/> : null}{dataSource === "cache" ? <CacheNotice fetchedAt={lastUpdatedAt} expired={cacheExpired} onRetry={() => void refresh()} /> : null}</>}
      renderTile={(place, tileWidth) => <ExplorePlaceTile place={place} saved={isSaved(place.id)} allowRemove onToggleSaved={(id) => void toggleSaved(id)} width={tileWidth} layout={layout}/>}
    />
  );
}
