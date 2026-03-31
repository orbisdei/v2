# Prompt 2: SiteForm UI — Attribution Input + Drag-and-Drop Reorder

## Context
Prompt 1 has already added `attribution: string` to `ImageEntry` and wired it through the data layer. This prompt adds two UI features to the shared `SiteForm` component in `components/admin/SiteForm.tsx`:
1. An attribution text input below each image thumbnail
2. Drag-and-drop reordering of images via grip handles

These changes apply everywhere `SiteForm` is used: Contribute page, Edit page, and Admin Import page.

## CRITICAL: Do NOT create new components
All changes go in the existing `components/admin/SiteForm.tsx`. Do not create separate form components.

## Tasks

### 1. Add `GripVertical` to lucide-react imports
At the top of `SiteForm.tsx`, the existing import from `lucide-react` includes `Upload, Plus, X, Loader2`. Add `GripVertical` to that import.

### 2. Redesign the image grid to support per-image inputs and drag handles
Currently, images render as a horizontal scrolling row of square thumbnails (`flex gap-2 overflow-x-auto`). This needs to become a vertical list where each image is a row with:

**Layout per image row** (when `!disabled`):
```
[Grip handle] [64×64 thumbnail] [Right side: caption input + attribution input + remove button]
```

Specifically:
- **Grip handle**: A `GripVertical` icon (size 16, `text-gray-400 cursor-grab`) on the far left. This is the drag handle.
- **Thumbnail**: 64×64 rounded square, same as current but in a row layout instead of horizontal scroll.
- **Right side** (flex-1, flex-col, gap-1.5):
  - Caption input: `<input type="text" placeholder="Caption (optional)" />` — uses `inputCls` but with `text-[12px]` override. Value bound to `img.caption`, onChange calls `updateImages` to update that image's caption.
  - Attribution input: `<input type="text" placeholder="Attribution (e.g. Photo by…, License)" />` — same styling. Value bound to `img.attribution`, onChange calls `updateImages` to update that image's attribution.
- **Remove/restore button**: The existing X button, repositioned to the top-right of the row (not overlaying the thumbnail).
- **Upload progress and error overlays** remain on the thumbnail, same as current.
- **Removed state**: The entire row gets `opacity-50` when `img.removed` is true, and the thumbnail gets a red overlay (same as current).

When `disabled` is true, hide the grip handle, hide the remove button, and make inputs read-only. Still show the vertical list layout so captions/attributions are visible.

The outer container should be `flex flex-col gap-3` instead of the current horizontal scroll.

### 3. Implement HTML5 drag-and-drop reordering

Add drag state to the component:
```tsx
const [dragIdx, setDragIdx] = useState<number | null>(null);
const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
```

On each image row (only for non-removed images, and only when `!disabled`):
- The **grip handle** element gets `draggable={true}` and the drag event handlers.
- `onDragStart`: Set `dragIdx` to this image's index. Set `e.dataTransfer.effectAllowed = 'move'`. Optionally set drag image to the thumbnail.
- `onDragOver` (on the row): `e.preventDefault()`. Set `dragOverIdx` to this row's index.
- `onDragEnd`: If `dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx`, reorder the images array by moving the dragged item to the target position. Call `updateImages` with the reordered array. Reset both `dragIdx` and `dragOverIdx` to null.
- `onDragLeave` (on the row): Only reset `dragOverIdx` if leaving the row entirely (check `e.currentTarget.contains(e.relatedTarget)`).

**Visual feedback during drag:**
- The dragged row gets `opacity-30`.
- The drop target row gets a top border indicator: `border-t-2 border-navy-400` when `dragOverIdx === thisIndex && dragIdx !== thisIndex`.

**Reorder logic:**
```tsx
function reorderImages(fromIdx: number, toIdx: number) {
  updateImages((prev) => {
    const visible = prev.filter(img => !img.removed);
    const removed = prev.filter(img => img.removed);
    const item = visible[fromIdx];
    const without = [...visible.slice(0, fromIdx), ...visible.slice(fromIdx + 1)];
    without.splice(toIdx, 0, item);
    // Recalculate display_order
    return [...without.map((img, i) => ({ ...img, display_order: i })), ...removed];
  });
}
```

### 4. Filter display list to show non-removed first, removed at bottom

When rendering the image list, show non-removed images first (these are draggable/reorderable), then removed images at the bottom (greyed out, not draggable, with restore button). This makes the drag targets cleaner.

```tsx
const visibleImages = images.filter(img => !img.removed);
const removedImages = images.filter(img => img.removed);
```

Render `visibleImages` with drag handles, then `removedImages` without drag handles and with `opacity-50`.

## Verification
After all changes:
```bash
# TypeScript check
npx tsc --noEmit

# Verify no duplicate SiteForm components were created
find . -name "SiteForm*" -not -path "./node_modules/*"
# Should only show: ./components/admin/SiteForm.tsx

# Verify GripVertical import
grep -n "GripVertical" components/admin/SiteForm.tsx

# Verify drag handlers exist
grep -n "onDragStart\|onDragOver\|onDragEnd\|dragIdx" components/admin/SiteForm.tsx

# Verify attribution input exists
grep -n "attribution" components/admin/SiteForm.tsx

# Build check
npm run build
```
