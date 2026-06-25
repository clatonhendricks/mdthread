import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Element } from 'hast';

/**
 * rehype plugin that copies source markdown offset info from mdast `position`
 * to hast element `data-md-start` / `data-md-end` attributes so the DOM can
 * be mapped back to the markdown source for comment anchoring.
 */
export const rehypeSourcePos: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'element', (node: Element) => {
      const pos = node.position;
      if (pos && pos.start && pos.end && pos.start.offset != null && pos.end.offset != null) {
        node.properties = node.properties || {};
        node.properties['dataMdStart'] = String(pos.start.offset);
        node.properties['dataMdEnd'] = String(pos.end.offset);
      }
    });
  };
};
