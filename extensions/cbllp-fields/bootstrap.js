var { Zotero } = ChromeUtils.import("chrome://zotero/content/zotero.mjs");

const CUSTOM_FIELDS = [
  {
    id: "attachment-code",
    label: "Attachment Code",
    hint: "E.g., DAS001 or Public Attachment 42"
  },
  {
    id: "confidentiality-status",
    label: "Confidentiality Status",
    hint: "Is this attachment public or confidential?"
  },
  {
    id: "initials",
    label: "Initials",
    hint: "Preparer’s initials (e.g., DAS, JKS)"
  }
];
const EXTRA_ROW = {
  id: "cbllp-extra",
  label: "Extra",
  hint: "Enter pinpoints or any additional citation data (e.g., at para 12, Table IV)"
};

function normalize(label) {
  return label.trim().replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[\s-_]+/g, '-').toLowerCase();
}

function parseExtra(item) {
  let extra = item.getField('extra') || '';
  let { fields, extra: rest } = Zotero.Utilities.Internal.extractExtraFields(
    extra,
    null,
    CUSTOM_FIELDS.map(f => f.label)
  );
  let map = {};
  for (let [k, v] of fields) {
    map[normalize(k)] = v;
  }
  return { map, extra: rest };
}

function saveExtra(item, map, rest) {
  let fieldMap = new Map();
  for (let f of CUSTOM_FIELDS) {
    if (map[f.id]) {
      fieldMap.set(f.label, map[f.id]);
    }
  }
  item.setField('extra', Zotero.Utilities.Internal.combineExtraFields(rest, fieldMap));
}

async function registerRows(pluginID) {
  for (let field of CUSTOM_FIELDS) {
    Zotero.ItemPaneManager.registerInfoRow({
      rowID: field.id,
      pluginID,
      label: { text: field.label },
      tooltipText: field.hint,
      onGetData({ item }) {
        return parseExtra(item).map[field.id] || '';
      },
      async onSetData({ item, value }) {
        let { map, extra } = parseExtra(item);
        if (value) {
          map[field.id] = value;
        } else {
          delete map[field.id];
        }
        saveExtra(item, map, extra);
      }
    });
  }

  Zotero.ItemPaneManager.registerInfoRow({
    rowID: EXTRA_ROW.id,
    pluginID,
    label: { text: EXTRA_ROW.label },
    tooltipText: EXTRA_ROW.hint,
    multiline: true,
    onGetData({ item }) {
      return parseExtra(item).extra;
    },
    onSetData({ item, value }) {
      let { map } = parseExtra(item);
      saveExtra(item, map, value || '');
    }
  });
}

function unregisterRows() {
  for (let field of CUSTOM_FIELDS) {
    Zotero.ItemPaneManager.unregisterInfoRow(field.id);
  }
  Zotero.ItemPaneManager.unregisterInfoRow(EXTRA_ROW.id);
}

function startup(params, reason) {
  registerRows(params.id);
}
function shutdown(params, reason) {
  unregisterRows();
}
function install() {}
function uninstall() {}
