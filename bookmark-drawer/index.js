/* global mp */

import moment from 'moment';
import { Component } from 'panel';

import './mp-drawer';

import css from './index.styl';
import template from './index.jade';

document.registerElement('bookmark-drawer', class extends Component {
  get config() {
    return {
      css,
      template,
      useShadowDom: true,

      defaultState: {
        bookmarks: [],
        nameFilter: '',
        userFilter: 'all',

        sortField: 'name',
        sortOrder: 'asc',
      },

      helpers: {
        bookmarksForDisplay: () => {
          let bookmarks = this.state.bookmarks;
          if (this.state.nameFilter) {
            const searchStr = this.state.nameFilter.toLowerCase();
            bookmarks = bookmarks.filter(bm => bm.name.toLowerCase().includes(searchStr));
          }
          return bookmarks.sort((a, b) => {
            a = a[this.state.sortField];
            b = b[this.state.sortField];
            if (this.state.sortField === 'modified') {
              a = moment.utc(a);
              b = moment.utc(b);
            } else if (typeof a === 'string') {
              a = a.toLowerCase();
              b = b.toLowerCase();
            }
            let cmp = a > b ? 1 : a < b ? -1 : 0;
            return this.state.sortOrder === 'desc' ? -cmp : cmp;
          });
        },
        changeNameFilter: ev => this.update({nameFilter: ev.target.value}),
        clickBookmark: bookmark => {
          this.dispatchEvent(new CustomEvent('change', {detail: {
            action: 'choose',
            bookmark: bookmark,
          }}));
          this.close();
        },
        clickDelete: bookmark => {
          this.dispatchEvent(new CustomEvent('change', {detail: {
            action: 'delete',
            bookmarkId: bookmark.id,
          }}));
        },
        clickFilter: userFilter => this.update({userFilter}),
        clickHeader: field => {
          const sortField = field;
          let sortOrder = this.state.sortOrder;
          if (field === this.state.sortField) {
            sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
          }
          this.update({sortField, sortOrder});
        },
        close: () => this.close(),
        drawerChange: ev => ev.detail && this.setAttribute('open', ev.detail.open),
        isOpen: () => this.isAttributeEnabled('open'),
        modifiedStr: bookmark => moment.utc(bookmark.modified).local().format('MMM D, YYYY'),
      },
    };
  }

  close() {
    this.drawer.close();
  }

  get drawer() {
    return this.el.querySelector('mp-drawer');
  }

  attachedCallback() {
    super.attachedCallback(...arguments);
    this.state.bookmarks = this.getJSONAttribute('bookmarks')
  }
  attributeChangedCallback(attr) {
    super.attributeChangedCallback(...arguments);
    if (attr === 'bookmarks') {
      this.state.bookmarks = this.getJSONAttribute('bookmarks');
    }
  }

});
