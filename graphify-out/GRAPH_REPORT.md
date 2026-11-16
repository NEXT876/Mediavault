# Graph Report - MediaVault  (2026-11-16)

## Corpus Check
- 69 files · ~45,853 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 1450 nodes · 3244 edges · 111 communities (34 shown, 77 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 218 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4f6b96ac`
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
- load_configs
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
- LibraryRoot
- .from_dict
- VaultConfig
- ConfigDialog
- EditDialog
- hint_label
- visible_entries
- CardGrid
- StickBanner
- MainWindow
- DetailDialog
- screenshots.py
- create_config
- test_card_grid.py
- test_plugin_import.py
- MediaDatabase
- GroupPickDialog
- main
- PluginImport
- test_theme.py
- dialogs.py
- MediaCard
- path_key
- .escape
- context7
- mediavault
- .file_path
- config.py
- ._build_cache
- target_angle
- VaultConfig

## God Nodes (most connected - your core abstractions)
1. `MediaDatabase` - 93 edges
2. `MediaItem` - 70 edges
3. `MainWindow` - 52 edges
4. `import_paths()` - 37 edges
5. `VaultConfig` - 33 edges
6. `CardGrid` - 32 edges
7. `button()` - 28 edges
8. `LibraryRoot` - 26 edges
9. `WheelPage` - 26 edges
10. `WheelWidget` - 24 edges

## Surprising Connections (you probably didn't know these)
- `page()` --uses--> `WheelPage`  [INFERRED]
  tests/test_wheel.py → mediavault/extras/wheel/page.py
- `grid()` --uses--> `CardGrid`  [INFERRED]
  tests/test_card_grid.py → mediavault/gui/card_grid.py
- `test_rejects_non_http_urls()` --uses--> `MediaDatabase`  [INFERRED]
  tests/test_remote.py → mediavault/database.py
- `test_rejects_unsafe_ids()` --uses--> `MediaDatabase`  [INFERRED]
  tests/test_remote.py → mediavault/database.py
- `_ai_entry()` --calls--> `MediaItem`  [INFERRED]
  tests/test_ai_meta.py → mediavault/models/media.py

## Import Cycles
- None detected.

## Communities (111 total, 77 thin omitted)

### Community 0 - "test_remote.py"
Cohesion: 0.05
Nodes (33): PreviewDialog, RemotePost, DownloadResult, download_and_import(), download_dir(), download_post(), fetch_preview(), _is_http() (+25 more)

### Community 2 - "import_paths"
Cohesion: 0.07
Nodes (43): build_entry(), content_hash(), find_duplicate(), import_paths(), _Index, _try_hash(), copy_into_folder(), unique_destination() (+35 more)

### Community 3 - "test_ai_meta.py"
Cohesion: 0.07
Nodes (40): ai_duplicate_key(), _as_float(), _as_int(), _decode_text(), extract_ai_metadata(), _find_prompt_text(), format_ai_meta(), _parse_comfyui() (+32 more)

### Community 4 - "test_config.py"
Cohesion: 0.33
Nodes (10): find_new_media(), _round_trip(), test_find_new_media_can_limit_the_types(), test_find_new_media_missing_folder_returns_empty(), test_find_new_media_recurses_and_skips_known(), test_find_new_media_skips_known_relative_paths(), test_find_new_media_splits_images_and_videos(), test_plugins_round_trip() (+2 more)

### Community 5 - "test_plugins.py"
Cohesion: 0.06
Nodes (42): FetchResult, _bug(), _candidates(), configure_plugin(), discover_plugins(), ImportPlugin, _invalid(), is_saveable() (+34 more)

### Community 6 - "RubberBandSelector"
Cohesion: 0.06
Nodes (6): RubberBandSelector, app(), _Card, _grid(), test_drag_selects_touched_cards_on_top_of_base(), test_move_without_press_does_nothing()

### Community 7 - "test_plugin_import.py"
Cohesion: 0.16
Nodes (7): download_status_text(), DownloadJob, DownloadRow, JobState, _job(), test_status_text_covers_every_state(), test_status_text_never_claims_a_file_past_the_total()

### Community 10 - "library.py"
Cohesion: 0.08
Nodes (7): file_filter(), index_files(), _matches(), media_exts(), MediaType, CopyResult, ImportResult

### Community 11 - "load_configs"
Cohesion: 0.17
Nodes (6): _default_config(), load_configs(), test_corrupt_file_is_not_overwritten(), test_missing_file_migrates_to_default_config(), test_unknown_last_and_mode_fall_back(), test_wrong_shape_falls_back_to_default()

### Community 14 - "_native_pick"
Cohesion: 0.19
Nodes (5): _filter_patterns(), _native_pick(), open_file(), pick_file(), pick_files()

### Community 16 - "ThemeManager"
Cohesion: 0.14
Nodes (3): repolish(), ThemeManager, test_toggle_cycles_through_all_themes()

### Community 19 - "volumes.py"
Cohesion: 0.05
Nodes (29): StickDialog, VolumeInfo, absolute_path(), find_volume(), folder_path(), marker_path(), mounted_roots(), new_uuid() (+21 more)

### Community 20 - "steps"
Cohesion: 0.11
Nodes (18): QT_QPA_PLATFORM, jobs, test, name, on, pull_request, contents, if (+10 more)

### Community 21 - "test_collapsible.py"
Cohesion: 0.13
Nodes (8): CollapsibleSection, app(), _section(), settings(), test_clicking_the_header_toggles_and_persists(), test_collapsed_by_default(), test_restores_the_saved_state(), test_toggled_signal()

### Community 22 - "test_wheel.py"
Cohesion: 0.16
Nodes (11): parse_entries(), target_angle(), _answer(), page(), test_all_groups_overwrite_confirmed(), test_all_groups_overwrite_warns_when_entries_are_unsaved(), test_no_groups_shows_hint_and_keeps_entries(), test_parse_entries_skips_blank_lines_and_strips() (+3 more)

### Community 23 - "FolderSync"
Cohesion: 0.10
Nodes (4): FolderPreviewDialog, FolderSync, run_with_progress(), Worker

### Community 24 - "Sidebar"
Cohesion: 0.05
Nodes (17): _nav_button(), Sidebar, saved(), app(), _checked(), sidebar(), test_one_button_per_plugin(), test_online_section_hidden_without_plugins() (+9 more)

### Community 28 - "load_thumbnail"
Cohesion: 0.06
Nodes (22): cache_key(), cache_path(), load_thumbnail(), load_thumbnails(), _read_cache(), _render(), _scaled(), _write_cache() (+14 more)

### Community 29 - "LibraryRoot"
Cohesion: 0.19
Nodes (12): find_unindexed(), not_indexed(), scan(), LibraryRoot, test_ai_mode_only_indexes_png(), test_file_filter_lists_every_known_extension(), test_find_unindexed_matches_paths_stored_relative_to_the_stick(), test_find_unindexed_skips_ignored_files() (+4 more)

### Community 30 - ".from_dict"
Cohesion: 0.25
Nodes (3): test_from_dict_ignores_unknown_keys(), test_legacy_dict_gets_empty_ai_meta(), test_to_dict_returns_detached_copy()

### Community 31 - "VaultConfig"
Cohesion: 0.33
Nodes (5): locate(), test_locate_keeps_a_local_config_on_its_folder(), test_locate_reports_an_unplugged_volume(), test_locate_treats_an_empty_folder_as_the_volume_root(), _volume_config()

### Community 34 - "hint_label"
Cohesion: 0.14
Nodes (5): LoadingLabel, _hint_label(), _section_label(), field_label(), hint_label()

### Community 35 - "visible_entries"
Cohesion: 0.44
Nodes (10): visible_entries(), _entries(), test_group_filter(), test_input_order_is_not_mutated(), test_last_watched_puts_unwatched_entries_last(), test_score_ties_are_broken_by_title_not_input_order(), test_search_finds_ai_prompts(), test_search_is_case_insensitive_across_fields() (+2 more)

### Community 39 - "DetailDialog"
Cohesion: 0.11
Nodes (3): DetailDialog, rounded_pixmap(), score_tier()

### Community 41 - "screenshots.py"
Cohesion: 0.24
Nodes (3): main(), paint_landscape(), settle()

### Community 42 - "create_config"
Cohesion: 0.22
Nodes (3): create_config(), _slug(), test_create_config_makes_unique_paths()

### Community 45 - "test_plugin_import.py"
Cohesion: 0.26
Nodes (9): apply_imported(), _configs(), _job(), _Plugin, test_apply_imported_rejects_unsaveable_settings(), test_apply_imported_skips_unclean_jobs(), test_apply_imported_stores_state_in_owning_config(), test_apply_imported_survives_plugin_error() (+1 more)

### Community 46 - "MediaDatabase"
Cohesion: 0.12
Nodes (19): MediaDatabase, MediaItem, test_concurrent_adds_keep_every_entry(), test_entry_without_title_is_treated_as_corrupt(), test_failed_backup_never_overwrites_corrupt_file(), test_load_corrupt_file_reports_error_and_backup(), test_numbers_stored_as_text_are_converted(), test_random_picks_only_from_the_given_pool() (+11 more)

### Community 50 - "main"
Cohesion: 0.29
Nodes (4): setup_logging(), main(), _scan_after_show(), _show_main()

### Community 54 - "test_theme.py"
Cohesion: 0.38
Nodes (3): build_qpalette(), build_stylesheet(), test_every_theme_fills_the_stylesheet()

### Community 55 - "dialogs.py"
Cohesion: 0.09
Nodes (4): AnalysisDialog, checked_groups(), group_checklist(), GroupRandomDialog

### Community 64 - "context7"
Cohesion: 0.50
Nodes (3): npx, context7, @upstash/context7-mcp

### Community 86 - "config.py"
Cohesion: 0.14
Nodes (4): int_setting(), _plugin_settings(), _stored(), write_json_atomic()

### Community 99 - "VaultConfig"
Cohesion: 0.18
Nodes (7): config_from_dict(), save_configs(), VaultConfig, test_configs_file_is_private(), test_folder_last_sync_defaults_and_round_trips(), test_known_keys_win_over_extra(), test_save_and_load_last_config()

## Knowledge Gaps
- **3 isolated node(s):** `npx`, `@upstash/context7-mcp`, `mediavault`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 631 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **77 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MediaDatabase` connect `MediaDatabase` to `test_remote.py`, `EditDialog`, `import_paths`, `MainWindow`, `DetailDialog`, `test_plugin_import.py`, `DownloadsPage`, `library.py`, `.__init__`, `main_window.py`, `load_configs`, `test_plugin_import.py`, `volumes.py`, `FolderSync`, `PluginImport`, `dialogs.py`, `path_key`, `LibraryRoot`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `MediaDatabase` (e.g. with `AnalysisDialog` and `DetailDialog`) actually correct?**
  _`MediaDatabase` has 20 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `@upstash/context7-mcp`, `mediavault` to the rest of the system?**
  _3 weakly-connected nodes found - possible missing edges._
- **Should `test_remote.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Why does `MainWindow` connect `MainWindow` to `.keyPressEvent`, `main_window.py`, `._show_page`, `screenshots.py`, `.cancel_drag`, `load_configs`, `._locate`, `._finish_batch`, `main`, `._activate_config`, `MediaCard`, `.closeEvent`, `._check_volumes`, `Sidebar`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `MediaItem` (e.g. with `_ai_entry()` and `test_summarize_prompts_counts_tags_models_and_scores()`) actually correct?**
  _`MediaItem` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Should `import_paths` be split into smaller, more focused modules?**
  _Cohesion score 0.06716417910447761 - nodes in this community are weakly interconnected._