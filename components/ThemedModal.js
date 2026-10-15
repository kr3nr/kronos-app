import React from 'react';
import { Modal } from 'react-native';

export default function ThemedModal({ children, visible, ...props }) {
  if (!visible) return null;
  return (
    <Modal visible={visible} {...props}>
      {children}
    </Modal>
  );
}
