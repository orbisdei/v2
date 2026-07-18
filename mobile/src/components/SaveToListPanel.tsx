// Mobile counterpart of the web SaveToListPanel: bottom-sheet modal for
// adding/removing a site across the user's lists, with inline list creation.

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../constants/theme';
import { useLists } from '../hooks/useLists';

interface SaveToListPanelProps {
  siteId: string;
  visible: boolean;
  onClose: () => void;
}

export function SaveToListPanel({ siteId, visible, onClose }: SaveToListPanelProps) {
  const { lists, toggleSiteOnList, createList } = useLists();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    const id = await createList(newName);
    setCreating(false);
    if (id) {
      setNewName('');
      toggleSiteOnList(siteId, id);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Save to list</Text>

          {lists.map((list) => {
            const on = list.siteIds.has(siteId);
            return (
              <Pressable
                key={list.id}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                onPress={() => toggleSiteOnList(siteId, list.id)}
              >
                <Ionicons
                  name={on ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={on ? Colors.navy : Colors.textSecondary}
                />
                <Text style={styles.rowLabel}>{list.name}</Text>
                {list.is_public && <Text style={styles.publicBadge}>Public</Text>}
              </Pressable>
            );
          })}

          <View style={styles.newRow}>
            <TextInput
              style={styles.input}
              placeholder="New list name…"
              placeholderTextColor={Colors.textSecondary}
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={handleCreate}
              returnKeyType="done"
            />
            <Pressable
              style={[styles.createBtn, (!newName.trim() || creating) && { opacity: 0.4 }]}
              disabled={!newName.trim() || creating}
              onPress={handleCreate}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          </View>

          <Pressable style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneLabel}>Done</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
    gap: 4,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  title: { fontFamily: Fonts.serif, fontSize: 18, fontWeight: '700', color: Colors.navy, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  rowLabel: { flex: 1, fontSize: 15, color: Colors.text },
  publicBadge: {
    fontSize: 11,
    color: Colors.featuredText,
    backgroundColor: Colors.featuredBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  newRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.text,
  },
  createBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 8,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: { alignSelf: 'center', marginTop: 12, padding: 8 },
  doneLabel: { color: Colors.navy, fontWeight: '700' },
});
