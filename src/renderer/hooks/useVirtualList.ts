/**
 * Virtual list hook for performance optimization
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseVirtualListOptions {
  itemHeight: number | ((index: number) => number);
  overscan?: number;
  estimatedItemHeight?: number;
  getItemKey?: (index: number) => string | number;
  onScroll?: (scrollTop: number) => void;
}

interface VirtualListState<T> {
  items: Array<{ index: number; data: T; offset: number }>;
  totalHeight: number;
  startIndex: number;
  endIndex: number;
}

export function useVirtualList<T>(
  allItems: T[],
  containerHeight: number,
  options: UseVirtualListOptions
) {
  const {
    itemHeight,
    overscan = 3,
    estimatedItemHeight = 50,
    getItemKey = (index) => index,
    onScroll
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [state, setState] = useState<VirtualListState<T>>({
    items: [],
    totalHeight: 0,
    startIndex: 0,
    endIndex: 0
  });

  const itemHeightCache = useRef<Map<number, number>>(new Map());
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate item height
  const getItemHeight = useCallback(
    (index: number): number => {
      if (typeof itemHeight === 'function') {
        if (!itemHeightCache.current.has(index)) {
          itemHeightCache.current.set(index, itemHeight(index));
        }
        return itemHeightCache.current.get(index)!;
      }
      return itemHeight;
    },
    [itemHeight]
  );

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return allItems.length * itemHeight;
    }

    let height = 0;
    for (let i = 0; i < allItems.length; i++) {
      height += getItemHeight(i);
    }
    return height;
  }, [allItems.length, itemHeight, getItemHeight]);

  // Calculate visible range
  useEffect(() => {
    if (containerHeight === 0) return;

    let accumulatedHeight = 0;
    let startIndex = -1;
    let endIndex = -1;

    // Find start index
    for (let i = 0; i < allItems.length; i++) {
      const height = getItemHeight(i);

      if (accumulatedHeight + height > scrollTop && startIndex === -1) {
        startIndex = Math.max(0, i - overscan);
      }

      if (accumulatedHeight > scrollTop + containerHeight && endIndex === -1) {
        endIndex = Math.min(allItems.length, i + overscan);
        break;
      }

      accumulatedHeight += height;
    }

    if (endIndex === -1) {
      endIndex = allItems.length;
    }

    // Calculate items with offsets
    const items: Array<{ index: number; data: T; offset: number }> = [];
    let offset = 0;

    for (let i = 0; i < allItems.length; i++) {
      if (i >= startIndex && i < endIndex) {
        items.push({
          index: i,
          data: allItems[i],
          offset
        });
      }
      offset += getItemHeight(i);
    }

    setState({
      items,
      totalHeight,
      startIndex,
      endIndex
    });
  }, [allItems, scrollTop, containerHeight, overscan, getItemHeight, totalHeight]);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);

      // Debounce onScroll callback
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        onScroll?.(newScrollTop);
      }, 50);
    },
    [onScroll]
  );

  // Scroll to item
  const scrollToItem = useCallback(
    (index: number, align: 'start' | 'center' | 'end' = 'start') => {
      if (index < 0 || index >= allItems.length) return;

      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i);
      }

      const itemH = getItemHeight(index);

      let scrollPosition = offset;
      if (align === 'center') {
        scrollPosition = offset - containerHeight / 2 + itemH / 2;
      } else if (align === 'end') {
        scrollPosition = offset - containerHeight + itemH;
      }

      setScrollTop(Math.max(0, Math.min(scrollPosition, totalHeight - containerHeight)));
    },
    [allItems.length, containerHeight, getItemHeight, totalHeight]
  );

  // Measure item
  const measureItem = useCallback(
    (index: number, height: number) => {
      const currentHeight = itemHeightCache.current.get(index);
      if (currentHeight !== height) {
        itemHeightCache.current.set(index, height);
        // Force re-render
        setState(prev => ({ ...prev }));
      }
    },
    []
  );

  // Clear cache when items change
  useEffect(() => {
    itemHeightCache.current.clear();
  }, [allItems]);

  return {
    virtualItems: state.items,
    totalHeight: state.totalHeight,
    startIndex: state.startIndex,
    endIndex: state.endIndex,
    scrollTop,
    handleScroll,
    scrollToItem,
    measureItem,
    getItemKey
  };
}

/**
 * Virtual grid hook for 2D virtualization
 */
export function useVirtualGrid<T>(
  allItems: T[],
  containerWidth: number,
  containerHeight: number,
  options: {
    itemWidth: number;
    itemHeight: number;
    gap?: number;
    overscan?: number;
  }
) {
  const { itemWidth, itemHeight, gap = 0, overscan = 2 } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Calculate grid dimensions
  const columns = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rows = Math.ceil(allItems.length / columns);
  const totalHeight = rows * (itemHeight + gap) - gap;
  const totalWidth = columns * (itemWidth + gap) - gap;

  // Calculate visible range
  const visibleRowStart = Math.floor(scrollTop / (itemHeight + gap));
  const visibleRowEnd = Math.ceil((scrollTop + containerHeight) / (itemHeight + gap));
  const visibleColStart = Math.floor(scrollLeft / (itemWidth + gap));
  const visibleColEnd = Math.ceil((scrollLeft + containerWidth) / (itemWidth + gap));

  // Apply overscan
  const rowStart = Math.max(0, visibleRowStart - overscan);
  const rowEnd = Math.min(rows, visibleRowEnd + overscan);
  const colStart = Math.max(0, visibleColStart - overscan);
  const colEnd = Math.min(columns, visibleColEnd + overscan);

  // Get visible items
  const visibleItems: Array<{
    index: number;
    data: T;
    row: number;
    col: number;
    x: number;
    y: number;
  }> = [];

  for (let row = rowStart; row < rowEnd; row++) {
    for (let col = colStart; col < colEnd; col++) {
      const index = row * columns + col;
      if (index < allItems.length) {
        visibleItems.push({
          index,
          data: allItems[index],
          row,
          col,
          x: col * (itemWidth + gap),
          y: row * (itemHeight + gap)
        });
      }
    }
  }

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  return {
    visibleItems,
    totalHeight,
    totalWidth,
    columns,
    rows,
    scrollTop,
    scrollLeft,
    handleScroll
  };
}