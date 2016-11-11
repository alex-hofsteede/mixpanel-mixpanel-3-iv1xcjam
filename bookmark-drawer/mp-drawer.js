import { Component } from 'panel';

import css from './mp-drawer.styl';
import template from './mp-drawer.jade';

document.registerElement('mp-drawer', class extends Component {
  get config() {
    return {
      css,
      template,
      useShadowDom: true,

      defaultState: {
        closing: false,
      },

      helpers: {
        close: () => this.close(),
        drawerWidth: () => `${this.getAttribute('drawer-width')}px`,
        isOpen: () => this.isAttributeEnabled('open'),
      },
    };
  }

  createdCallback() {
    super.createdCallback(...arguments);
    document.body.style.position = 'relative';
  }

  attributeChangedCallback(attr, oldVal, newVal) {
    super.attributeChangedCallback(...arguments);
    if (attr === 'open') {
      this.update({closing: !newVal});
    }
  }

  close() {
    this.update({closing: true});
    window.setTimeout(() => {
      this.removeAttribute('open');
      this.dispatchEvent(new CustomEvent('change', {detail: {action: 'close', open: false}}));
    }, 150);
  }
});
