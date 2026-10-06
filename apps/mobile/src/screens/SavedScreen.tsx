import { buildDiscoveryItems } from "@knogo/core";
import { ExploreGroupTile, ExplorePlaceTile } from "../components/PlaceCards";
import { CacheNotice, Eyebrow, Notice, Skeleton, Title } from "../components/Ui";
import { VirtualizedGrid } from "../components/VirtualizedGrid";
import { usePlaces } from "../state/PlacesContext";

export function SavedScreen() {
  const { places, placeGroups, savedPlaceIds, isSaved, toggleSaved, loading, refreshing, error, dataSource, lastUpdatedAt, cacheExpired, refresh } = usePlaces();
  const saved = places.filter((place) => savedPlaceIds.includes(place.id));
  const items = buildDiscoveryItems(saved, placeGroups, null);
  const empty = loading && !places.length
    ? <><Skeleton /><Skeleton /></>
    : error && !places.length
      ? <Notice title="Could not load saved places" message={error} actionLabel="Try again" onAction={() => void refresh()} />
      : <Notice title="Nothing saved yet" message="Save a place to keep its live checks close." />;

  return (
    <VirtualizedGrid
      data={items}
      columns={3}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      empty={empty}
      header={<><Eyebrow>Saved</Eyebrow><Title>Your places.</Title>{dataSource === "cache" ? <CacheNotice fetchedAt={lastUpdatedAt} expired={cacheExpired} onRetry={() => void refresh()} /> : null}</>}
      renderTile={(item, width) => item.kind === "group" && item.branches.length > 1
        ? <ExploreGroupTile group={item.group} branches={item.branches} width={width} />
        : (() => { const place = item.kind === "group" ? item.branches[0] : item.place; return <ExplorePlaceTile place={place} saved={isSaved(place.id)} onToggleSaved={(id) => void toggleSaved(id)} width={width} />; })()}
    />
  );
}
