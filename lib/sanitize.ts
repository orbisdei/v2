// Strips HTML tags from a string. Re-applies the replacement until the output
// stabilizes so that nested/overlapping sequences (e.g. "<scr<script>ipt>")
// can't reassemble into a tag after a single pass.
export function stripHtmlTags(input: string): string {
  let out = input;
  let prev: string;
  do {
    prev = out;
    out = out.replace(/<[^>]*>/g, '');
  } while (out !== prev);
  return out;
}

// Escapes a string for safe interpolation into an HTML document.
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
