import { BottomSheet, RNHostView } from '@expo/ui';
import type { ReactElement } from 'react';

export interface SearchSortSheetProps {
  visible: boolean;
  onDismiss: () => void;
  background: string;
  children: ReactElement;
}

export default function SearchSortSheet({ visible, onDismiss, background, children }: SearchSortSheetProps) {
  return (
    <BottomSheet
      isPresented={visible}
      onDismiss={onDismiss}
      showDragIndicator={false}
      containerColor={background}
      contentPadding={0}
    >
      <RNHostView matchContents={{ vertical: true }}>{children}</RNHostView>
    </BottomSheet>
  );
}
