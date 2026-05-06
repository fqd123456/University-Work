import { ScrollView, View } from '@tarojs/components'
import {
  Fragment,
  type ComponentProps,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'

type ScrollEventHandler = NonNullable<ComponentProps<typeof ScrollView>['onScroll']>
type ScrollViewBaseProps = Omit<
  ComponentProps<typeof ScrollView>,
  'children' | 'scrollY' | 'onScroll' | 'style'
>

type VirtualListStyle = Record<string, string | number>

export interface VirtualListProps<T> extends ScrollViewBaseProps {
  items: T[]
  itemHeight: number
  height: number
  renderItem: (item: T, index: number) => ReactNode
  children?: ReactNode
  keyExtractor?: (item: T, index: number) => string | number
  bufferSize?: number
  scrollTop?: number
  onScroll?: ScrollEventHandler
  style?: VirtualListStyle
}

const DEFAULT_BUFFER_SIZE = 5

function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  children,
  keyExtractor,
  bufferSize = DEFAULT_BUFFER_SIZE,
  scrollTop,
  onScroll,
  style,
  ...scrollViewProps
}: VirtualListProps<T>) {
  const safeItemHeight = Math.max(1, itemHeight)
  const safeHeight = Math.max(1, height)
  const [internalScrollTop, setInternalScrollTop] = useState(scrollTop ?? 0)

  useEffect(() => {
    if (scrollTop !== undefined) {
      setInternalScrollTop(scrollTop)
    }
  }, [scrollTop])

  const { startIndex, visibleItems, offsetTop, offsetBottom } = useMemo(() => {
    const totalCount = items.length
    const visibleCount = Math.max(1, Math.ceil(safeHeight / safeItemHeight))
    const nextStartIndex = Math.max(
      0,
      Math.floor(internalScrollTop / safeItemHeight) - bufferSize,
    )
    const nextEndIndex = Math.min(
      totalCount,
      nextStartIndex + visibleCount + bufferSize * 2,
    )

    return {
      startIndex: nextStartIndex,
      endIndex: nextEndIndex,
      visibleItems: items.slice(nextStartIndex, nextEndIndex),
      offsetTop: nextStartIndex * safeItemHeight,
      offsetBottom: (totalCount - nextEndIndex) * safeItemHeight,
    }
  }, [bufferSize, internalScrollTop, items, safeHeight, safeItemHeight])

  const mergedStyle = useMemo(
    () => ({
      ...style,
      height: `${safeHeight}px`,
    }),
    [safeHeight, style],
  )

  const handleScroll: ScrollEventHandler = event => {
    setInternalScrollTop(event.detail.scrollTop)
    onScroll?.(event)
  }

  return (
    <ScrollView
      {...scrollViewProps}
      scrollY
      scrollTop={scrollTop}
      onScroll={handleScroll}
      style={mergedStyle}
    >
      {children !== undefined && children !== null ? (
        children
      ) : (
        <>
          <View style={{ height: `${offsetTop}px` }} />
          {visibleItems.map((item, index) => {
            const itemIndex = startIndex + index
            const key = keyExtractor ? keyExtractor(item, itemIndex) : itemIndex

            return <Fragment key={key}>{renderItem(item, itemIndex)}</Fragment>
          })}
          <View style={{ height: `${offsetBottom}px` }} />
        </>
      )}
    </ScrollView>
  )
}

export default VirtualList
