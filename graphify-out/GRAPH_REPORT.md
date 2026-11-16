# Graph Report - MediaVault  (2026-11-16)

## Corpus Check
- 68 files · ~45,060 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 1440 nodes · 3214 edges · 106 communities (32 shown, 74 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 216 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8cd6543d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_remote.py
- import_paths
- test_ai_meta.py
- test_config.py
- test_plugins.py
- RubberBandSelector
- test_plugin_import.py
- main_window.py
- DownloadsPage
- library.py
- os
- main
- _native_pick
- ThemeManager
- WheelPage
- WheelWidget
- volumes.py
- steps
- test_collapsible.py
- test_wheel.py
- FolderSync
- Sidebar
- load_thumbnail
- .__init__
- dialogs.py
- models/__init__.py
- ConfigDialog
- ._setup_ui
- EditDialog
- visible_entries
- CardGrid
- StickBanner
- MainWindow
- DetailDialog
- test_sidebar.py
- StickDialog
- test_card_grid.py
- test_plugin_import.py
- MediaDatabase
- media_preview.py
- GroupPickDialog
- config.py
- test_collapsible.py
- test_theme.py
- test_models_boundary.py
- MediaCard
- .set_page
- absolute_path
- sidebar
- .escape
- context7
- isolated_thumb_cache
- mediavault
- test_volumes.py
- VaultConfig
- page.py
- ._apply_entries

## God Nodes (most connected - your core abstractions)
1. `MediaDatabase` - 93 edges
2. `MediaItem` - 70 edges
3. `MainWindow` - 51 edges
4. `import_paths()` - 37 edges
5. `VaultConfig` - 33 edges
6. `CardGrid` - 32 edges
7. `button()` - 28 edges
8. `LibraryRoot` - 26 edges
9. `WheelPage` - 26 edges
10. `WheelWidget` - 24 edges

## Surprising Connections (you probably didn't know these)
- `test_neon_cards_glow_only_when_selected_or_hovered()` --calls--> `MediaItem`  [INFERRED]
  tests/test_theme.py → mediavault/models/media.py
- `page()` --uses--> `WheelPage`  [INFERRED]
  tests/test_wheel.py → mediavault/extras/wheel/page.py
- `sidebar()` --uses--> `Sidebar`  [INFERRED]
  tests/test_sidebar.py → mediavault/gui/sidebar.py
- `grid()` --uses--> `CardGrid`  [INFERRED]
  tests/test_card_grid.py → mediavault/gui/card_grid.py
- `test_rejects_non_http_urls()` --uses--> `MediaDatabase`  [INFERRED]
  tests/test_remote.py → mediavault/database.py

## Import Cycles
- None detected.

## Communities (106 total, 74 thin omitted)

### Community 0 - "test_remote.py"
Cohesion: 0.06
Nodes (31): PreviewDialog, RemotePost, download_and_import(), download_dir(), download_post(), fetch_preview(), _is_http(), _request() (+23 more)

### Community 2 - "import_paths"
Cohesion: 0.07
Nodes (42): build_entry(), content_hash(), find_duplicate(), import_paths(), _try_hash(), copy_into_folder(), unique_destination(), is_inside() (+34 more)

### Community 3 - "test_ai_meta.py"
Cohesion: 0.09
Nodes (30): ai_duplicate_key(), _as_float(), _as_int(), _decode_text(), extract_ai_metadata(), _find_prompt_text(), format_ai_meta(), _parse_comfyui() (+22 more)

### Community 4 - "test_config.py"
Cohesion: 0.14
Nodes (20): load_configs(), locate(), find_new_media(), _round_trip(), test_corrupt_file_is_not_overwritten(), test_find_new_media_can_limit_the_types(), test_find_new_media_missing_folder_returns_empty(), test_find_new_media_recurses_and_skips_known() (+12 more)

### Community 5 - "test_plugins.py"
Cohesion: 0.06
Nodes (42): FetchResult, _bug(), _candidates(), configure_plugin(), discover_plugins(), ImportPlugin, _invalid(), is_saveable() (+34 more)

### Community 6 - "RubberBandSelector"
Cohesion: 0.06
Nodes (6): RubberBandSelector, app(), _Card, _grid(), test_drag_selects_touched_cards_on_top_of_base(), test_move_without_press_does_nothing()

### Community 7 - "test_plugin_import.py"
Cohesion: 0.14
Nodes (7): download_status_text(), DownloadJob, DownloadRow, JobState, _job(), test_status_text_covers_every_state(), test_status_text_never_claims_a_file_past_the_total()

### Community 10 - "library.py"
Cohesion: 0.10
Nodes (17): file_filter(), find_unindexed(), index_files(), media_exts(), not_indexed(), scan(), MediaType, ImportResult (+9 more)

### Community 11 - "os"
Cohesion: 0.18
Nodes (8): _clean(), load_wheel_configs(), save_wheel_configs(), write_json_atomic(), test_corrupt_file_is_kept_aside_instead_of_overwritten(), test_load_drops_malformed_data(), test_missing_file_gives_no_configs(), test_roundtrip_keeps_umlauts_and_order()

### Community 12 - "main"
Cohesion: 0.17
Nodes (5): _build_splash_pixmap(), main(), _scan_after_show(), _show_main(), _splash_font()

### Community 14 - "_native_pick"
Cohesion: 0.14
Nodes (5): _filter_patterns(), _native_pick(), open_file(), pick_file(), pick_files()

### Community 16 - "ThemeManager"
Cohesion: 0.14
Nodes (3): repolish(), ThemeManager, test_toggle_cycles_through_all_themes()

### Community 17 - "WheelPage"
Cohesion: 0.12
Nodes (3): matching_config(), WheelPage, test_matching_config_needs_identical_entries_in_order()

### Community 19 - "volumes.py"
Cohesion: 0.09
Nodes (15): VolumeInfo, find_volume(), marker_path(), mounted_roots(), new_uuid(), _norm(), read_marker(), relative_to_root() (+7 more)

### Community 20 - "steps"
Cohesion: 0.11
Nodes (18): QT_QPA_PLATFORM, jobs, test, name, on, pull_request, contents, if (+10 more)

### Community 22 - "test_wheel.py"
Cohesion: 0.13
Nodes (12): target_angle(), saved(), app(), _answer(), page(), qtbot_free_app(), test_all_groups_overwrite_confirmed(), test_all_groups_overwrite_warns_when_entries_are_unsaved() (+4 more)

### Community 23 - "FolderSync"
Cohesion: 0.10
Nodes (4): FolderPreviewDialog, FolderSync, run_with_progress(), Worker

### Community 28 - "load_thumbnail"
Cohesion: 0.12
Nodes (17): cache_key(), cache_path(), load_thumbnail(), load_thumbnails(), _read_cache(), _render(), _scaled(), _write_cache() (+9 more)

### Community 33 - "._setup_ui"
Cohesion: 0.20
Nodes (3): LoadingLabel, _hint_label(), _section_label()

### Community 34 - "EditDialog"
Cohesion: 0.08
Nodes (5): checked_groups(), EditDialog, group_checklist(), GroupRandomDialog, field_label()

### Community 35 - "visible_entries"
Cohesion: 0.34
Nodes (11): _matches(), visible_entries(), _entries(), test_group_filter(), test_input_order_is_not_mutated(), test_last_watched_puts_unwatched_entries_last(), test_score_ties_are_broken_by_title_not_input_order(), test_search_finds_ai_prompts() (+3 more)

### Community 41 - "test_sidebar.py"
Cohesion: 0.18
Nodes (7): test_one_button_per_plugin(), test_online_section_hidden_without_plugins(), test_online_section_only_outside_ai_mode(), test_online_section_stays_hidden_without_plugins_in_normal_mode(), test_plugin_loading_text(), test_set_plugins_keeps_section_hidden_in_ai_mode(), test_set_plugins_replaces_old_buttons()

### Community 42 - "StickDialog"
Cohesion: 0.12
Nodes (3): create_config(), StickDialog, test_create_config_makes_unique_paths()

### Community 45 - "test_plugin_import.py"
Cohesion: 0.26
Nodes (9): apply_imported(), _configs(), _job(), _Plugin, test_apply_imported_rejects_unsaveable_settings(), test_apply_imported_skips_unclean_jobs(), test_apply_imported_stores_state_in_owning_config(), test_apply_imported_survives_plugin_error() (+1 more)

### Community 46 - "MediaDatabase"
Cohesion: 0.08
Nodes (23): MediaDatabase, MediaItem, test_concurrent_adds_keep_every_entry(), test_entry_without_title_is_treated_as_corrupt(), test_failed_backup_never_overwrites_corrupt_file(), test_load_corrupt_file_reports_error_and_backup(), test_numbers_stored_as_text_are_converted(), test_random_picks_only_from_the_given_pool() (+15 more)

### Community 50 - "config.py"
Cohesion: 0.21
Nodes (3): _prompt_tags(), setup_logging(), _slug()

### Community 52 - "test_collapsible.py"
Cohesion: 0.31
Nodes (7): app(), _section(), settings(), test_clicking_the_header_toggles_and_persists(), test_collapsed_by_default(), test_restores_the_saved_state(), test_toggled_signal()

### Community 54 - "test_theme.py"
Cohesion: 0.38
Nodes (3): build_qpalette(), build_stylesheet(), test_every_theme_fills_the_stylesheet()

### Community 64 - "context7"
Cohesion: 0.50
Nodes (3): npx, context7, @upstash/context7-mcp

### Community 79 - "test_volumes.py"
Cohesion: 0.14
Nodes (13): folder_path(), path_key(), stored_path(), _make_volume(), test_absolute_path_never_returns_the_root(), test_find_volume_matches_uuid_only(), test_folder_path_treats_empty_as_the_root(), test_path_key_matches_absolute_and_relative() (+5 more)

### Community 86 - "VaultConfig"
Cohesion: 0.10
Nodes (11): config_from_dict(), _default_config(), int_setting(), _plugin_settings(), save_configs(), _stored(), VaultConfig, test_configs_file_is_private() (+3 more)

### Community 90 - "._apply_entries"
Cohesion: 0.14
Nodes (3): parse_entries(), test_parse_entries_skips_blank_lines_and_strips(), test_spin_uses_text_typed_within_the_debounce_delay()

## Knowledge Gaps
- **3 isolated node(s):** `npx`, `@upstash/context7-mcp`, `mediavault`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 627 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **74 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MediaDatabase` connect `MediaDatabase` to `ConfigDialog`, `test_remote.py`, `EditDialog`, `import_paths`, `DetailDialog`, `main_window.py`, `test_plugin_import.py`, `DownloadsPage`, `library.py`, `test_plugin_import.py`, `test_volumes.py`, `.__init__`, `._activate_config`, `VaultConfig`, `FolderSync`, `absolute_path`, `dialogs.py`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `MediaDatabase` (e.g. with `AnalysisDialog` and `DetailDialog`) actually correct?**
  _`MediaDatabase` has 20 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `@upstash/context7-mcp`, `mediavault` to the rest of the system?**
  _3 weakly-connected nodes found - possible missing edges._
- **Should `test_remote.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Why does `MediaItem` connect `MediaDatabase` to `import_paths`, `test_ai_meta.py`, `RubberBandSelector`, `main_window.py`, `library.py`, `load_thumbnail`, `.__init__`, `dialogs.py`, `EditDialog`, `visible_entries`, `CardGrid`, `MainWindow`, `DetailDialog`, `.entries`, `MediaCard`, `absolute_path`, `.escape`, `test_volumes.py`, `.set_file`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `MediaItem` (e.g. with `_ai_entry()` and `test_summarize_prompts_counts_tags_models_and_scores()`) actually correct?**
  _`MediaItem` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Should `import_paths` be split into smaller, more focused modules?**
  _Cohesion score 0.07431693989071038 - nodes in this community are weakly interconnected._