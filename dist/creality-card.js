(() => {
  const Lit =
    window.LitElement ||
    Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
  const html = Lit.prototype.html;
  const css = Lit.prototype.css;

  /* ------------------------------------------------------------------ */
  /*  Defaults                                                           */
  /* ------------------------------------------------------------------ */
  const DEFAULTS = {
    title: "Creality Printer",
    show_header: true,
    show_stage: true,
    show_webcam: true,
    show_file_preview: true,
    show_progress: true,
    show_controls: true,
    show_temperatures: true,
    show_actions: true,
    show_status: true,
    compact_status: false,
  };

  /* ------------------------------------------------------------------ */
  /*  Printer image helpers                                              */
  /* ------------------------------------------------------------------ */
  const PRINTER_IMAGES = {
    k1: "k1.png",
    k1max: "k1max.png",
    k1c: "k1c.png",
    k2plus: "k2plus.png",
  };
  function guessPrinterImage(model, key) {
    if (!model && key) model = key;
    if (!model) return PRINTER_IMAGES.k1;
    model = String(model).toLowerCase();
    if (model.includes("k2plus")) return PRINTER_IMAGES.k2plus;
    if (model.includes("k1_max")) return PRINTER_IMAGES.k1max;
    if (model.includes("k1c")) return PRINTER_IMAGES.k1c;
    if (model.includes("k1")) return PRINTER_IMAGES.k1;
    return PRINTER_IMAGES.k1;
  }

  /* ------------------------------------------------------------------ */
  /*  Safe read helper                                                   */
  /* ------------------------------------------------------------------ */
  const read = (hass, entity) => {
    const st = hass?.states?.[entity];
    if (!st) return undefined;
    const v = st.state;
    if (v === "unknown" || v === "unavailable") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  };

  /* ================================================================== */
  /*  VISUAL EDITOR                                                      */
  /* ================================================================== */
  class CrealityPrinterCardEditor extends Lit {
    static get properties() {
      return { hass: {}, _config: {} };
    }

    static get styles() {
      return css`
        :host { display: block; }
        .editor { padding: 16px 0; }
        .editor h3 {
          margin: 18px 0 8px 0; font-size: 13px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .3px;
          color: var(--secondary-text-color);
          display: flex; align-items: center; gap: 6px;
        }
        .editor h3 ha-icon { --mdi-icon-size: 16px; }
        .editor h3:first-child { margin-top: 0; }
        .field {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 0; border-bottom: 1px solid var(--divider-color);
        }
        .field:last-child { border-bottom: none; }
        .field-label { font-size: 14px; display: flex; align-items: center; gap: 8px; }
        .field-label ha-icon { --mdi-icon-size: 20px; color: var(--secondary-text-color); }
        .field input[type="text"] {
          border: 1px solid var(--divider-color); border-radius: 8px;
          padding: 6px 10px; background: var(--card-background-color);
          color: var(--primary-text-color); font-size: 13px; width: 220px;
          max-width: 50%;
        }
        .toggle-track {
          width: 44px; height: 24px; border-radius: 12px; position: relative;
          background: var(--disabled-text-color, #666); cursor: pointer;
          transition: background .2s ease; flex-shrink: 0;
        }
        .toggle-track.on { background: var(--primary-color); }
        .toggle-track::after {
          content: ""; position: absolute; top: 2px; left: 2px;
          width: 20px; height: 20px; border-radius: 50%;
          background: #fff; transition: left .18s ease;
        }
        .toggle-track.on::after { left: 22px; }
      `;
    }

    setConfig(config) {
      this._config = { ...config };
    }

    _val(key) {
      return this._config[key] ?? DEFAULTS[key];
    }

    _toggleOpt(key) {
      const cur = this._val(key);
      this._config = { ...this._config, [key]: !cur };
      this._fire();
    }

    _textChanged(key, e) {
      this._config = { ...this._config, [key]: e.target.value };
      this._fire();
    }

    _fire() {
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: this._config },
          bubbles: true,
          composed: true,
        })
      );
    }

    render() {
      if (!this._config) return html``;

      const toggle = (label, icon, key) => html`
        <div class="field">
          <span class="field-label"><ha-icon icon="${icon}"></ha-icon>${label}</span>
          <div class="toggle-track ${this._val(key) ? 'on' : ''}"
               @click=${() => this._toggleOpt(key)}></div>
        </div>`;

      const text = (label, icon, key, placeholder = "") => html`
        <div class="field">
          <span class="field-label"><ha-icon icon="${icon}"></ha-icon>${label}</span>
          <input type="text" .value=${this._config[key] ?? ""}
                 placeholder="${placeholder}"
                 @input=${(e) => this._textChanged(key, e)} />
        </div>`;

      return html`
        <div class="editor">
          <h3><ha-icon icon="mdi:cog-outline"></ha-icon> General</h3>
          ${text("Card Title", "mdi:format-title", "title", "Creality Printer")}
          ${text("Filter Prefix", "mdi:filter-outline", "filter_prefix", "e.g. k1_max")}
          ${text("Default Printer", "mdi:printer-3d", "default_printer", "e.g. k1_max")}
          ${text("Images Path", "mdi:image-outline", "images_path", "URL or local path")}

          <h3><ha-icon icon="mdi:eye-outline"></ha-icon> Visibility</h3>
          ${toggle("Show Header Bar", "mdi:page-layout-header", "show_header")}
          ${toggle("Show Printer Image", "mdi:printer-3d-nozzle", "show_stage")}
          ${toggle("Show Webcam", "mdi:webcam", "show_webcam")}
          ${toggle("Show File Preview", "mdi:file-image-outline", "show_file_preview")}
          ${toggle("Show Progress Bar", "mdi:progress-check", "show_progress")}
          ${toggle("Show Controls (Switches)", "mdi:toggle-switch-outline", "show_controls")}
          ${toggle("Show Temperatures", "mdi:thermometer", "show_temperatures")}
          ${toggle("Show Actions", "mdi:play-box-outline", "show_actions")}
          ${toggle("Show Status Panel", "mdi:information-outline", "show_status")}

          <h3><ha-icon icon="mdi:palette-outline"></ha-icon> Layout</h3>
          ${toggle("Compact Status (smaller rows)", "mdi:view-compact-outline", "compact_status")}
        </div>
      `;
    }
  }

  if (!customElements.get("creality-printer-card-editor")) {
    customElements.define("creality-printer-card-editor", CrealityPrinterCardEditor);
  }

  /* ================================================================== */
  /*  MAIN CARD                                                          */
  /* ================================================================== */
  class CrealityPrinterCard extends Lit {
    static get properties() {
      return {
        hass: {},
        _config: {},
        _printers: { type: Array },
        _printerKey: { type: String },
        _data: { type: Object },
        _modalOpen: { type: Boolean },
      };
    }

    static get styles() {
      return css`
        ha-card { overflow: hidden; }

        /* ---- Top bar ---- */
        .bar {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; border-bottom: 1px solid var(--divider-color);
          flex-wrap: wrap;
        }
        .title { font-weight: 700; font-size: 14px; letter-spacing: .2px; }
        .spacer { flex: 1; min-width: 4px; }
        select {
          border: 1px solid var(--divider-color); border-radius: 10px;
          padding: 6px 10px; background: var(--card-background-color);
          color: var(--primary-text-color); font-size: 12px;
        }
        .chip {
          pointer-events: none; backdrop-filter: blur(5px);
          background: color-mix(in srgb, var(--card-background-color) 75%, transparent);
          border: 1px solid var(--divider-color); border-radius: 999px;
          padding: 4px 10px; font-size: 11px; display: inline-flex;
          align-items: center; gap: 4px;
        }
        .chip ha-icon { --mdi-icon-size: 14px; }
        .ok   { border-color: color-mix(in srgb, var(--success-color, #4caf50) 50%, var(--divider-color)); }
        .warn { border-color: color-mix(in srgb, var(--warning-color, #ffb300) 60%, var(--divider-color)); }
        .err  { border-color: color-mix(in srgb, var(--error-color, #e53935) 60%, var(--divider-color)); }

        /* ---- Stage ---- */
        .stage {
          position: relative; width: 100%; aspect-ratio: 11/8;
          max-height: 420px; isolation: isolate; display: grid;
          place-items: center; overflow: hidden; background: #181818;
          border-bottom: 1px solid var(--divider-color);
        }
        .printerimg {
          width: 100%; height: 100%; object-fit: contain;
          user-select: none; background: #222;
        }
        .file-preview {
          position: absolute; right: 10px; top: 10px;
          width: clamp(100px, 18vw, 200px); aspect-ratio: 1/1;
          overflow: hidden; border: 1px solid var(--divider-color);
          border-radius: 12px; background: #000;
        }
        .file-preview img, .webcam img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .webcam {
          position: absolute; left: 10px; bottom: 10px;
          width: clamp(120px, 20vw, 240px); aspect-ratio: 16/10;
          overflow: hidden; border: 1px solid var(--divider-color);
          border-radius: 12px; background: #000; cursor: zoom-in;
        }

        /* ---- Progress strip ---- */
        .prog {
          display: flex; gap: 10px; align-items: center;
          padding: 10px 12px; border-bottom: 1px solid var(--divider-color);
          font-variant-numeric: tabular-nums; flex-wrap: wrap;
        }
        .barwrap {
          height: 8px; flex: 1; min-width: 60px; border-radius: 999px;
          overflow: hidden;
          background: color-mix(in srgb, var(--primary-text-color) 18%, transparent);
        }
        .barfill {
          height: 100%; width: 0%;
          background: linear-gradient(90deg,
            color-mix(in srgb, var(--primary-color) 75%, transparent),
            color-mix(in srgb, var(--primary-color) 45%, var(--secondary-background-color)));
          transition: width .3s ease;
        }
        .prog .kv {
          font-size: 12px; color: var(--secondary-text-color);
          display: inline-flex; align-items: center; gap: 3px;
          white-space: nowrap;
        }
        .prog .kv b { color: var(--primary-text-color); }
        .prog .kv ha-icon { --mdi-icon-size: 14px; }

        /* ---- Body ---- */
        .body {
          display: grid; gap: 12px; padding: 12px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 520px) {
          .body.two-col { grid-template-columns: 1fr 1fr; }
        }

        .panel {
          border: 1px solid var(--divider-color);
          background: color-mix(in srgb, var(--card-background-color) 90%, transparent);
          border-radius: 12px; padding: 12px;
        }
        .panel h3 {
          margin: 0 0 10px 0; font-size: 12px; letter-spacing: .25px;
          text-transform: uppercase; color: var(--secondary-text-color);
          display: flex; align-items: center; gap: 6px;
        }
        .panel h3 ha-icon { --mdi-icon-size: 16px; }
        .section-gap { margin-top: 14px; }

        /* ---- Switch grid ---- */
        .switch-grid {
          display: grid; gap: 10px;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        }
        .switch {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; border: 1px solid var(--divider-color); border-radius: 12px;
          padding: 10px;
          background: color-mix(in srgb, var(--card-background-color) 85%, transparent);
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .switch:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 12px rgba(0,0,0,.14);
        }
        .sw-label {
          font-size: 13px; font-weight: 600;
          display: flex; align-items: center; gap: 6px;
        }
        .sw-label ha-icon { --mdi-icon-size: 18px; color: var(--secondary-text-color); }
        .toggle {
          --w: 44px; --h: 24px; width: var(--w); height: var(--h);
          background: #3a3a3a; border-radius: var(--h); position: relative;
          border: 1px solid var(--divider-color); cursor: pointer; flex-shrink: 0;
        }
        .toggle::after {
          content: ""; position: absolute; top: 2px; left: 2px;
          width: 20px; height: 20px; background: #fff; border-radius: 50%;
          transition: all .18s ease;
        }
        .toggle.on {
          background: color-mix(in srgb, var(--accent-color, #00c853) 50%, #3a3a3a);
        }
        .toggle.on::after { left: calc(100% - 22px); }

        /* ---- Sensor grid ---- */
        .sensor-grid {
          display: grid; gap: 10px;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        }
        .sensor {
          border: 1px solid var(--divider-color); border-radius: 12px; padding: 10px;
          background: color-mix(in srgb, var(--card-background-color) 88%, transparent);
        }
        .sensor-head {
          display: inline-flex; align-items: center; gap: 5px;
          margin: 0 0 6px 0; font-size: 10px; font-weight: 800;
          letter-spacing: .25px; text-transform: uppercase;
          color: var(--secondary-text-color);
          padding: 2px 6px; border-radius: 999px;
          background: color-mix(in srgb, var(--primary-text-color) 10%, transparent);
        }
        .sensor-head ha-icon { --mdi-icon-size: 14px; }
        .sensor .val { font-size: 22px; font-weight: 800; margin: 2px 0 0 0; }
        .sensor .sub { font-size: 12px; color: var(--secondary-text-color); }

        /* ---- Status ---- */
        .status-list { display: grid; gap: 8px; font-size: 13px; }
        .status-list .row {
          display: grid; grid-template-columns: 140px 1fr; column-gap: 10px;
          align-items: center; padding: 6px 8px;
          border: 1px dashed var(--divider-color); border-radius: 10px;
          background: color-mix(in srgb, var(--card-background-color) 84%, transparent);
        }
        .status-list .row label {
          color: var(--secondary-text-color);
          display: flex; align-items: center; gap: 4px; font-size: 12px;
        }
        .status-list .row label ha-icon { --mdi-icon-size: 14px; }
        .status-list.compact .row {
          grid-template-columns: auto 1fr; padding: 4px 8px; gap: 6px;
        }

        /* ---- Action buttons ---- */
        .action-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
        .quick {
          border: 1px solid var(--divider-color); border-radius: 10px;
          padding: 8px 14px; background: var(--secondary-background-color);
          color: var(--primary-text-color); font-size: 12px; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px; font-weight: 600;
          transition: transform .08s ease, box-shadow .08s ease;
        }
        .quick ha-icon { --mdi-icon-size: 18px; }
        .quick:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(0,0,0,.18);
        }

        /* ---- Modal ---- */
        .modal {
          position: fixed; inset: 0; display: none; place-items: center;
          background: rgba(0,0,0,.7); z-index: 30;
        }
        .modal.open { display: grid; }
        .modal .modal-box {
          width: min(92vw, 1100px); border-radius: 14px;
          overflow: hidden; background: #000;
          border: 1px solid var(--divider-color);
        }
        .modal .modal-box img { width: 100%; height: auto; display: block; }

        /* ---- No data ---- */
        .no-data {
          padding: 24px 18px; text-align: center;
          color: var(--secondary-text-color); font-size: 14px;
        }
        .no-data ha-icon {
          --mdi-icon-size: 48px; display: block;
          margin: 0 auto 12px; opacity: .5;
        }
      `;
    }

    setConfig(config) {
      this._config = {
        ...DEFAULTS,
        ...config,
        images_path:
          ((config.images_path ??
            "https://raw.githubusercontent.com/rathlinus/ha-creality-card/refs/heads/main/assets/"
          ).replace(/\/+$/, "")) + "/",
        filter_prefix: config.filter_prefix ?? "",
        default_printer: config.default_printer,
        entities: config.entities || {},
        cameras: config.cameras || {},
        actions: Object.assign(
          {
            auto_home: {
              domain: "creality_lan",
              service: "get_bed_leveling",
              data: {},
            },
            pause: {
              domain: "switch",
              service: "turn_on",
              data: (k) => ({ entity_id: `switch.${k}_pause` }),
            },
            unpause: {
              domain: "switch",
              service: "turn_off",
              data: (k) => ({ entity_id: `switch.${k}_pause` }),
            },
            stop: {
              domain: "switch",
              service: "turn_on",
              data: (k) => ({ entity_id: `switch.${k}_stop` }),
            },
          },
          config.actions || {}
        ),
      };
    }

    getCardSize() {
      let s = 1;
      if (this._config.show_stage) s += 3;
      if (this._config.show_progress) s += 1;
      if (
        this._config.show_controls ||
        this._config.show_temperatures ||
        this._config.show_actions
      )
        s += 2;
      if (this._config.show_status) s += 2;
      return s;
    }

    set hass(hass) {
      this._hass = hass;
      if (!hass) return;

      const printers = this._detectPrinters(hass);
      const prevPrinter = this._printerKey;
      this._printers = printers;

      if (printers.length === 0) {
        this._printerKey = undefined;
        this._data = undefined;
        return;
      }
      if (!this._printerKey) {
        const want =
          this._config.default_printer &&
          printers.find((p) => p.key.includes(this._config.default_printer));
        this._printerKey = (want || printers[0]).key;
      } else if (!printers.some((p) => p.key === this._printerKey)) {
        this._printerKey = printers[0].key;
      }

      this._data = this._collectData(hass, this._printerKey);
      if (prevPrinter !== this._printerKey) this.requestUpdate();
    }

    /* -------------------------------------------------------------- */
    /*  Render                                                         */
    /* -------------------------------------------------------------- */
    render() {
      const cfg = this._config;
      const p = this._printers ?? [];
      const pk = this._printerKey;
      const d = this._data;

      const tgl = (label, icon, entity) => html`
        <div class="switch">
          <span class="sw-label">
            <ha-icon icon="${icon}"></ha-icon>${label}
          </span>
          <div class="toggle ${this._hass?.states?.[entity]?.state === 'on' ? 'on' : ''}"
               role="switch"
               aria-checked="${this._hass?.states?.[entity]?.state === 'on'}"
               @click=${() => this._toggleSwitch(entity)}></div>
        </div>`;

      /* Count visible body panels for 2-col layout */
      const hasLeftPanel =
        cfg.show_controls || cfg.show_temperatures || cfg.show_actions;
      const hasRightPanel = cfg.show_status;
      const twoCol = hasLeftPanel && hasRightPanel;

      return html`
        <ha-card @click=${(e) => this._maybeCloseModal(e)}>

          ${cfg.show_header !== false ? html`
          <div class="bar">
            <div class="title">${cfg.title}</div>
            <span class="chip ${d?.online ? 'ok' : 'err'}">
              <ha-icon icon="${d?.online
                ? 'mdi:check-circle-outline'
                : 'mdi:alert-circle-outline'}"></ha-icon>
              ${d?.online ? 'Online' : 'Offline'}
            </span>
            ${d?.state_text ? html`
              <span class="chip">
                <ha-icon icon="mdi:printer-3d-nozzle-outline"></ha-icon>
                ${d.state_text}
              </span>` : ''}
            <div class="spacer"></div>
            ${p.length > 1 ? html`
              <select @change=${this._onPrinterChange}>
                ${p.map((it) => html`
                  <option value=${it.key} ?selected=${it.key === pk}>
                    ${it.label}
                  </option>`)}
              </select>` : ''}
          </div>` : ''}

          ${d ? html`

            ${cfg.show_stage !== false ? html`
              <div class="stage">
                <img class="printerimg" draggable="false"
                     src="${cfg.images_path}${guessPrinterImage(d.model, pk)}"
                     alt="printer" />
                ${cfg.show_file_preview !== false && d.current_file_image ? html`
                  <div class="file-preview" title="Current file image">
                    <img src="${d.current_file_image}" alt="file image" />
                  </div>` : ''}
                ${cfg.show_webcam !== false && d.webcam_url ? html`
                  <div class="webcam" title="Click to enlarge"
                       @click=${() => this._openModal()}>
                    <img src="${d.webcam_url}" alt="webcam" />
                  </div>` : ''}
              </div>` : ''}

            ${cfg.show_progress !== false ? html`
              <div class="prog" aria-label="Print Progress">
                <div class="barwrap">
                  <div class="barfill" style="width:${d.progress ?? 0}%"></div>
                </div>
                <div class="kv">
                  <ha-icon icon="mdi:percent"></ha-icon>
                  <b>${d.progress ?? 0}%</b>
                </div>
                <div class="kv">
                  <ha-icon icon="mdi:layers-outline"></ha-icon>
                  Layer <b>${d.layer ?? 0}</b>/<span>${d.total_layers ?? 0}</span>
                </div>
                <div class="kv">
                  <ha-icon icon="mdi:timer-outline"></ha-icon>
                  Elapsed <b>${this._fmtHMS(d.elapsed_sec)}</b>
                </div>
                <div class="kv">
                  <ha-icon icon="mdi:timer-sand"></ha-icon>
                  Remaining <b>${this._fmtHMS(d.remaining_sec)}</b>
                </div>
              </div>` : ''}

            ${hasLeftPanel || hasRightPanel ? html`
              <div class="body ${twoCol ? 'two-col' : ''}">

                ${hasLeftPanel ? html`
                  <div class="panel">

                    ${cfg.show_controls !== false ? html`
                      <h3>
                        <ha-icon icon="mdi:toggle-switch-outline"></ha-icon>
                        Controls
                      </h3>
                      <div class="switch-grid">
                        ${tgl('Light', 'mdi:lightbulb-outline', `switch.${pk}_light`)}
                        ${tgl('Model Fan', 'mdi:fan', `switch.${pk}_fan_model`)}
                        ${tgl('Case Fan', 'mdi:fan-auto', `switch.${pk}_fan_case`)}
                        ${tgl('Aux Fan', 'mdi:fan-plus', `switch.${pk}_fan_aux`)}
                      </div>` : ''}

                    ${cfg.show_temperatures !== false ? html`
                      <h3 class="${cfg.show_controls !== false ? 'section-gap' : ''}">
                        <ha-icon icon="mdi:thermometer"></ha-icon>
                        Temperatures
                      </h3>
                      <div class="sensor-grid">
                        <div class="sensor">
                          <span class="sensor-head">
                            <ha-icon icon="mdi:radiator"></ha-icon> Bed
                          </span>
                          <div class="val">${this._fmtNum(d.bed_temp, '\u00B0C')}</div>
                          <div class="sub">Target: ${this._fmtNum(d.bed_target, '\u00B0C')}</div>
                        </div>
                        <div class="sensor">
                          <span class="sensor-head">
                            <ha-icon icon="mdi:thermostat-box"></ha-icon> Chamber
                          </span>
                          <div class="val">${this._fmtNum(d.chamber_temp, '\u00B0C')}</div>
                          <div class="sub">Ambient</div>
                        </div>
                        <div class="sensor">
                          <span class="sensor-head">
                            <ha-icon icon="mdi:printer-3d-nozzle-heat-outline"></ha-icon> Nozzle
                          </span>
                          <div class="val">${this._fmtNum(d.nozzle_temp, '\u00B0C')}</div>
                          <div class="sub">Target: ${this._fmtNum(d.nozzle_target, '\u00B0C')}</div>
                        </div>
                      </div>` : ''}

                    ${cfg.show_actions !== false ? html`
                      <h3 class="${
                        (cfg.show_controls !== false || cfg.show_temperatures !== false)
                          ? 'section-gap'
                          : ''
                      }">
                        <ha-icon icon="mdi:play-box-outline"></ha-icon>
                        Actions
                      </h3>
                      <div class="action-buttons">
                        <button class="quick"
                                @click=${() => this._doAction('auto_home', pk)}>
                          <ha-icon icon="mdi:home-outline"></ha-icon> Auto Home
                        </button>
                        ${d?.state_text === 'Printing' || d?.state_code === 'printing'
                          ? html`<button class="quick"
                                         @click=${() => this._doAction('pause', pk)}>
                              <ha-icon icon="mdi:pause"></ha-icon> Pause
                            </button>`
                          : html`<button class="quick"
                                         @click=${() => this._doAction('unpause', pk)}>
                              <ha-icon icon="mdi:play"></ha-icon> Resume
                            </button>`}
                        <button class="quick"
                                @click=${() => this._doAction('stop', pk)}>
                          <ha-icon icon="mdi:stop"></ha-icon> Stop
                        </button>
                      </div>` : ''}

                  </div>` : ''}

                ${hasRightPanel ? html`
                  <div class="panel">
                    <h3>
                      <ha-icon icon="mdi:information-outline"></ha-icon> Status
                    </h3>
                    <div class="status-list ${cfg.compact_status ? 'compact' : ''}">
                      <div class="row">
                        <label><ha-icon icon="mdi:file-document-outline"></ha-icon> File</label>
                        <div>${d.file ?? '\u2014'}</div>
                      </div>
                      <div class="row">
                        <label><ha-icon icon="mdi:access-point-network"></ha-icon> Online</label>
                        <div>${d.online ? 'Online' : 'Offline'}</div>
                      </div>
                      <div class="row">
                        <label><ha-icon icon="mdi:state-machine"></ha-icon> State</label>
                        <div>${d.state_text ?? '\u2014'}</div>
                      </div>
                      <div class="row">
                        <label><ha-icon icon="mdi:code-tags"></ha-icon> Code</label>
                        <div>${d.state_code ?? '\u2014'}</div>
                      </div>
                      <div class="row">
                        <label><ha-icon icon="mdi:percent"></ha-icon> Progress</label>
                        <div>${d.progress ?? 0}%</div>
                      </div>
                      <div class="row">
                        <label><ha-icon icon="mdi:layers-outline"></ha-icon> Layer</label>
                        <div>${d.layer ?? 0} / ${d.total_layers ?? 0}</div>
                      </div>
                      <div class="row">
                        <label><ha-icon icon="mdi:timer-outline"></ha-icon> Elapsed</label>
                        <div>${this._fmtHMS(d.elapsed_sec)}</div>
                      </div>
                      <div class="row">
                        <label><ha-icon icon="mdi:timer-sand"></ha-icon> Remaining</label>
                        <div>${this._fmtHMS(d.remaining_sec)}</div>
                      </div>
                    </div>
                  </div>` : ''}

              </div>` : ''}

          ` : html`
            <div class="no-data">
              <ha-icon icon="mdi:printer-3d-off"></ha-icon>
              No printer found. Check your entities or filter prefix.
            </div>`}

        </ha-card>

        ${this._modalOpen && d?.webcam_url ? html`
          <div class="modal open" @click=${() => this._closeModal()}>
            <div class="modal-box">
              <img src="${d.webcam_url}" alt="Webcam enlarged" />
            </div>
          </div>` : ''}
      `;
    }

    /* -------------------------------------------------------------- */
    /*  Actions & Toggles                                              */
    /* -------------------------------------------------------------- */
    _doAction(name, key) {
      const a = this._config.actions?.[name];
      if (!a) return;
      const data =
        typeof a.data === "function" ? a.data(key) : a.data || {};
      this._hass.callService(a.domain, a.service, data);
    }

    _toggleSwitch(entity) {
      const st = this._hass.states[entity];
      if (!st) return;
      const [domain] = entity.split(".");
      this._hass.callService(
        domain,
        st.state === "on" ? "turn_off" : "turn_on",
        { entity_id: entity }
      );
    }

    _openModal() {
      this._modalOpen = true;
    }
    _closeModal() {
      this._modalOpen = false;
    }
    _maybeCloseModal(e) {
      if (e.composedPath().some((el) => el?.classList?.contains("modal")))
        this._closeModal();
    }

    _onPrinterChange = (e) => {
      this._printerKey = e.target.value;
      this._data = this._collectData(this._hass, this._printerKey);
      this.requestUpdate();
    };

    /* -------------------------------------------------------------- */
    /*  Detection & Data                                               */
    /* -------------------------------------------------------------- */
    _detectPrinters(hass) {
      const printers = new Map();
      const re =
        /^sensor\.(.+?)_(progress|state_text|nozzle_temp|bed_temp|chamber_temp|file|job_time|time_left|layer|total_layers|state_code)$/;
      for (const [eid] of Object.entries(hass.states)) {
        if (!eid.startsWith("sensor.")) continue;
        if (
          this._config.filter_prefix &&
          !eid.includes(this._config.filter_prefix)
        )
          continue;
        const m = eid.match(re);
        if (m) {
          let key = m[1];
          key = key.replace(
            /(_print|_current|_status|_job|_file|_progress|_state|_temp|_chamber|_bed|_nozzle)+$/i,
            ""
          );
          key = key.replace(/_+$/, "");
          if (!key) continue;
          printers.set(key, true);
        }
      }
      const arr = [];
      for (const key of printers.keys()) {
        arr.push({ key, label: this._prettyKey(key) });
      }
      arr.sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true })
      );
      return arr;
    }

    _prettyKey(k) {
      return k
        .replace(/[_\\.]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    _collectData(hass, key) {
      const findField = (field) => {
        const escKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const escField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(
          `^sensor\\.${escKey}.*${escField}.*$`,
          "i"
        );
        for (const [eid, st] of Object.entries(hass.states)) {
          if (!eid.startsWith("sensor.")) continue;
          if (!re.test(eid)) continue;
          if (st.state === "unknown" || st.state === "unavailable") continue;
          const n = Number(st.state);
          return Number.isFinite(n) ? n : st.state;
        }
        return undefined;
      };

      // Online from binary_sensor
      const online = (() => {
        const ids = [
          `binary_sensor.${key}_online`,
          `binary_sensor.${key}_status`,
          `binary_sensor.${key}_connected`,
        ];
        for (const id of ids) {
          const st = hass.states[id];
          if (st) return st.state === "on";
        }
        return undefined;
      })();

      // Webcam URL
      const webcam_url = (() => {
        const override = this._config.cameras?.[key];
        const camIds = override
          ? [override]
          : [`camera.${key}_webcam`, `camera.${key}`];
        for (const id of camIds) {
          const st = hass.states[id];
          if (st) {
            const token = st.attributes?.access_token;
            if (token)
              return hass.hassUrl(
                `/api/camera_proxy_stream/${id}?token=${token}`
              );
          }
        }
        for (const id of camIds) {
          const st = hass.states[id];
          if (st) {
            const token = st.attributes?.access_token;
            if (token)
              return hass.hassUrl(
                `/api/camera_proxy/${id}?token=${token}`
              );
            return hass.hassUrl(`/api/camera_proxy/${id}`);
          }
        }
        return undefined;
      }).call(this);

      // Current file preview image entity
      const current_file_image = (() => {
        const imgIds = [
          `image.${key}_current`,
          `sensor.${key}_current_file_image`,
        ];
        for (const id of imgIds) {
          const st = hass.states[id];
          if (st) return st.attributes?.entity_picture || st.state;
        }
        return undefined;
      })();

      // Model from attributes
      let model = undefined;
      for (const [eid, st] of Object.entries(hass.states)) {
        if (
          eid.startsWith(`sensor.${key}`) &&
          st.attributes &&
          st.attributes.model
        ) {
          model = st.attributes.model;
          break;
        }
      }
      if (!model) model = key;

      return {
        model,
        online,
        webcam_url,
        current_file_image,
        file: findField("file") || findField("current_file_name"),
        state_text: findField("state_text") || findField("state"),
        state_code: findField("state_code"),
        progress: findField("progress"),
        layer: findField("layer") ?? findField("current_layer"),
        total_layers: findField("total_layers") ?? findField("total_layer"),
        elapsed_sec: findField("job_time") ?? findField("time_elapsed"),
        remaining_sec: findField("time_left") ?? findField("time_remaining"),
        nozzle_temp: findField("nozzle_temp") ?? findField("tool0_temp"),
        nozzle_target:
          findField("nozzle_target") ?? findField("tool0_target"),
        bed_temp: findField("bed_temp"),
        bed_target: findField("bed_target"),
        chamber_temp: findField("chamber_temp"),
      };
    }

    _fmtHMS(s) {
      const n = Math.max(0, Math.floor(Number(s) || 0));
      const h = String(Math.floor(n / 3600)).padStart(2, "0");
      const m = String(Math.floor((n % 3600) / 60)).padStart(2, "0");
      const sec = String(n % 60).padStart(2, "0");
      return `${h}:${m}:${sec}`;
    }

    _fmtNum(v, unit = "") {
      return v === undefined || v === null || v === ""
        ? "\u2014"
        : `${v}${unit}`;
    }

    /* -------------------------------------------------------------- */
    /*  Editor integration                                             */
    /* -------------------------------------------------------------- */
    static getConfigElement() {
      return document.createElement("creality-printer-card-editor");
    }

    static getStubConfig() {
      return { ...DEFAULTS };
    }
  }

  customElements.define("creality-printer-card", CrealityPrinterCard);
  if (window.customCards) {
    window.customCards.push({
      type: "creality-printer-card",
      name: "Creality Printer Card",
      description:
        "Creality 3D Printer Card with visual editor, customizable sections, and live webcam.",
    });
  }
})();
