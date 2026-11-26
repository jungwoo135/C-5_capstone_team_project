import { Host, ModalBottomSheet, RNHostView, type ModalBottomSheetRef } from '@expo/ui/jetpack-compose';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { SearchSortSheetProps } from './search-sort-sheet';

export default function SearchSortSheet({ visible, onDismiss, background, children }: SearchSortSheetProps) {
  const [mounted, setMounted] = useState(visible);
  const sheet = useRef<ModalBottomSheetRef>(null);

  if (visible && !mounted) {
    setMounted(true);
  }

  useEffect(() => {
    if (visible || !mounted) return;
    let active = true;
    const finish = () => {
      if (active) setMounted(false);
    };
    void sheet.current?.hide().then(finish, finish);
    return () => {
      active = false;
    };
  }, [mounted, visible]);

  if (!mounted) return null;

  return (
    <Host style={StyleSheet.absoluteFill} pointerEvents="none">
      <ModalBottomSheet
        ref={sheet}
        onDismissRequest={onDismiss}
        skipPartiallyExpanded
        showDragHandle={false}
        containerColor={background}
        scrimColor="rgba(41, 37, 44, 0.40)"
      >
        <RNHostView matchContents={{ vertical: true }}>{children}</RNHostView>
      </ModalBottomSheet>
    </Host>
  );
}
