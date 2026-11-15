# Graph Report - MediaVault  (2026-11-15)

## Corpus Check
- 68 files · ~44,831 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 2)

## Summary
- 1430 nodes · 3189 edges · 105 communities (41 shown, 64 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 212 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `17694375`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_remote.py
- import_paths
- test_ai_meta.py
- test_config.py
- run_fetch
- RubberBandSelector
- test_plugin_import.py
- plugin_import.py
- DownloadsPage
- library.py
- os
- ThemeManager
- button
- _native_pick
- MediaCard
- plugins.py
- WheelPage
- WheelWidget
- volumes.py
- steps
- test_collapsible.py
- test_wheel.py
- FolderSync
- Sidebar
- load_configs
- load_thumbnail
- main_window.py
- models/__init__.py
- ConfigDialog
- ._setup_ui
- GroupPickDialog
- visible_entries
- CardGrid
- StickBanner
- DetailDialog
- MainWindow
- StickDialog
- test_card_grid.py
- target_angle
- MediaItem
- ._build_cache
- locate
- create_config
- test_plugins.py
- EditDialog
- MediaType
- .escape
- volume_for_path
- test_library.py
- absolute_path
- context7
- PluginError
- mediavault
- test_volumes.py
- config_from_dict
- VaultConfig
- PluginImport
- path_key
- PluginError
- MediaItem
- Configuring

## God Nodes (most connected - your core abstractions)
1. `MediaDatabase` - 93 edges
2. `MediaItem` - 68 edges
3. `MainWindow` - 51 edges
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

## Communities (105 total, 64 thin omitted)

### Community 0 - "test_remote.py"
Cohesion: 0.05
Nodes (32): PreviewDialog, RemotePost, download_and_import(), download_dir(), download_post(), fetch_preview(), _is_http(), _request() (+24 more)

### Community 2 - "import_paths"
Cohesion: 0.12
Nodes (27): find_duplicate(), import_paths(), _ai_png(), _db(), test_content_hash_differs_for_different_content(), test_content_hash_matches_identical_content(), test_entry_resolves_back_to_the_original_file(), test_find_duplicate_detects_stored_content() (+19 more)

### Community 3 - "test_ai_meta.py"
Cohesion: 0.07
Nodes (40): ai_duplicate_key(), _as_float(), _as_int(), _decode_text(), extract_ai_metadata(), _find_prompt_text(), format_ai_meta(), _parse_comfyui() (+32 more)

### Community 4 - "test_config.py"
Cohesion: 0.33
Nodes (10): find_new_media(), _round_trip(), test_find_new_media_can_limit_the_types(), test_find_new_media_missing_folder_returns_empty(), test_find_new_media_recurses_and_skips_known(), test_find_new_media_skips_known_relative_paths(), test_find_new_media_splits_images_and_videos(), test_plugins_round_trip() (+2 more)

### Community 5 - "run_fetch"
Cohesion: 0.19
Nodes (13): FetchResult, run_fetch(), Dummy, no_preview(), post(), test_run_fetch_drops_duplicate_ids(), test_run_fetch_passes_plugin_error(), test_run_fetch_rejects_posts_of_wrong_type() (+5 more)

### Community 6 - "RubberBandSelector"
Cohesion: 0.06
Nodes (6): RubberBandSelector, app(), _Card, _grid(), test_drag_selects_touched_cards_on_top_of_base(), test_move_without_press_does_nothing()

### Community 7 - "test_plugin_import.py"
Cohesion: 0.10
Nodes (16): download_status_text(), DownloadJob, DownloadRow, JobState, apply_imported(), _job(), test_status_text_covers_every_state(), test_status_text_never_claims_a_file_past_the_total() (+8 more)

### Community 10 - "library.py"
Cohesion: 0.18
Nodes (7): index_files(), not_indexed(), scan(), ImportResult, LibraryRoot, test_not_indexed_reports_rejected_files(), test_scan_does_nothing_while_the_stick_is_unplugged()

### Community 11 - "os"
Cohesion: 0.16
Nodes (14): build_entry(), content_hash(), _try_hash(), copy_into_folder(), unique_destination(), test_copies_a_file_into_the_folder(), test_file_already_inside_the_folder_is_kept(), test_is_inside_handles_prefix_lookalikes() (+6 more)

### Community 12 - "ThemeManager"
Cohesion: 0.08
Nodes (10): build_qpalette(), build_stylesheet(), ThemeManager, _build_splash_pixmap(), main(), _scan_after_show(), _show_main(), _splash_font() (+2 more)

### Community 13 - "button"
Cohesion: 0.13
Nodes (4): _hint_label(), button(), field_label(), hint_label()

### Community 14 - "_native_pick"
Cohesion: 0.19
Nodes (5): _filter_patterns(), _native_pick(), open_file(), pick_file(), pick_files()

### Community 15 - "MediaCard"
Cohesion: 0.09
Nodes (4): repolish(), MediaCard, rounded_pixmap(), score_tier()

### Community 16 - "plugins.py"
Cohesion: 0.14
Nodes (8): _candidates(), is_saveable(), _load(), migrate_settings(), Migrating, test_migrate_called_only_without_settings(), test_migrate_error_leaves_extra(), test_plugin_without_migrate_is_left_alone()

### Community 19 - "volumes.py"
Cohesion: 0.12
Nodes (9): VolumeInfo, find_volume(), marker_path(), new_uuid(), read_marker(), vaults(), write_marker(), test_marker_round_trip() (+1 more)

### Community 20 - "steps"
Cohesion: 0.11
Nodes (18): QT_QPA_PLATFORM, jobs, test, name, on, pull_request, contents, if (+10 more)

### Community 21 - "test_collapsible.py"
Cohesion: 0.13
Nodes (8): CollapsibleSection, app(), _section(), settings(), test_clicking_the_header_toggles_and_persists(), test_collapsed_by_default(), test_restores_the_saved_state(), test_toggled_signal()

### Community 22 - "test_wheel.py"
Cohesion: 0.13
Nodes (12): parse_entries(), saved(), app(), _answer(), page(), qtbot_free_app(), test_all_groups_overwrite_confirmed(), test_all_groups_overwrite_warns_when_entries_are_unsaved() (+4 more)

### Community 24 - "Sidebar"
Cohesion: 0.06
Nodes (13): _nav_button(), Sidebar, app(), _checked(), sidebar(), test_one_button_per_plugin(), test_online_section_hidden_without_plugins(), test_online_section_only_outside_ai_mode() (+5 more)

### Community 26 - "load_configs"
Cohesion: 0.17
Nodes (6): _default_config(), load_configs(), test_corrupt_file_is_not_overwritten(), test_missing_file_migrates_to_default_config(), test_unknown_last_and_mode_fall_back(), test_wrong_shape_falls_back_to_default()

### Community 28 - "load_thumbnail"
Cohesion: 0.06
Nodes (22): cache_key(), cache_path(), load_thumbnail(), load_thumbnails(), _read_cache(), _render(), _scaled(), _write_cache() (+14 more)

### Community 32 - "ConfigDialog"
Cohesion: 0.13
Nodes (3): AnalysisDialog, ConfigDialog, FolderPreviewDialog

### Community 34 - "GroupPickDialog"
Cohesion: 0.10
Nodes (4): GroupPickDialog, checked_groups(), group_checklist(), GroupRandomDialog

### Community 35 - "visible_entries"
Cohesion: 0.34
Nodes (11): _matches(), visible_entries(), _entries(), test_group_filter(), test_input_order_is_not_mutated(), test_last_watched_puts_unwatched_entries_last(), test_score_ties_are_broken_by_title_not_input_order(), test_search_finds_ai_prompts() (+3 more)

### Community 45 - "target_angle"
Cohesion: 0.22
Nodes (3): target_angle(), test_spin_uses_text_typed_within_the_debounce_delay(), test_target_angle_puts_winner_under_pointer()

### Community 46 - "MediaItem"
Cohesion: 0.12
Nodes (12): MediaDatabase, test_concurrent_adds_keep_every_entry(), test_entry_without_title_is_treated_as_corrupt(), test_failed_backup_never_overwrites_corrupt_file(), test_load_corrupt_file_reports_error_and_backup(), test_numbers_stored_as_text_are_converted(), test_random_picks_only_from_the_given_pool(), test_save_leaves_no_temp_file() (+4 more)

### Community 48 - "locate"
Cohesion: 0.33
Nodes (5): locate(), test_locate_keeps_a_local_config_on_its_folder(), test_locate_reports_an_unplugged_volume(), test_locate_treats_an_empty_folder_as_the_volume_root(), _volume_config()

### Community 50 - "create_config"
Cohesion: 0.22
Nodes (3): create_config(), _slug(), test_create_config_makes_unique_paths()

### Community 51 - "test_plugins.py"
Cohesion: 0.32
Nodes (10): discover_plugins(), test_broken_plugins_are_skipped(), test_discovers_public_and_private(), test_duplicate_name_first_wins(), test_missing_root_returns_empty(), test_private_folder_itself_is_not_a_plugin(), test_readme_example_loads(), test_relative_import_and_hyphen_folder() (+2 more)

### Community 54 - "MediaType"
Cohesion: 0.20
Nodes (3): file_filter(), MediaType, test_file_filter_lists_every_known_extension()

### Community 57 - "volume_for_path"
Cohesion: 0.15
Nodes (6): is_inside(), mounted_roots(), _norm(), relative_to_root(), volume_for_path(), test_volume_for_path_outside_any_root()

### Community 59 - "test_library.py"
Cohesion: 0.27
Nodes (7): find_unindexed(), media_exts(), test_ai_mode_only_indexes_png(), test_find_unindexed_matches_paths_stored_relative_to_the_stick(), test_find_unindexed_skips_ignored_files(), test_scan_stores_stick_paths_relative(), _touch()

### Community 64 - "context7"
Cohesion: 0.50
Nodes (3): npx, context7, @upstash/context7-mcp

### Community 65 - "PluginError"
Cohesion: 0.25
Nodes (3): _bug(), _invalid(), PluginError

### Community 79 - "test_volumes.py"
Cohesion: 0.17
Nodes (11): absolute_path(), folder_path(), _safe_parts(), _make_volume(), test_absolute_path_never_returns_the_root(), test_find_volume_matches_uuid_only(), test_folder_path_treats_empty_as_the_root(), test_paths_cannot_escape_the_volume() (+3 more)

### Community 80 - "config_from_dict"
Cohesion: 0.33
Nodes (3): config_from_dict(), int_setting(), _plugin_settings()

### Community 86 - "VaultConfig"
Cohesion: 0.18
Nodes (7): save_configs(), _stored(), VaultConfig, test_configs_file_is_private(), test_folder_last_sync_defaults_and_round_trips(), test_known_keys_win_over_extra(), test_save_and_load_last_config()

### Community 91 - "path_key"
Cohesion: 0.33
Nodes (4): path_key(), stored_path(), test_path_key_matches_absolute_and_relative(), test_stored_path_keeps_paths_outside_the_volume()

### Community 92 - "PluginError"
Cohesion: 0.40
Nodes (3): test_configure_plugin_rejects_unsaveable_settings(), test_migrate_rejects_unsaveable_settings(), _Unsaveable

### Community 99 - "MediaItem"
Cohesion: 0.10
Nodes (12): MediaItem, _smart_weights(), test_add_many_saves_once(), test_add_saves(), test_ai_meta_round_trip(), test_file_path_prefers_video_over_preview_image(), test_from_dict_ignores_unknown_keys(), test_legacy_dict_gets_empty_ai_meta() (+4 more)

### Community 100 - "Configuring"
Cohesion: 0.20
Nodes (4): configure_plugin(), Configuring, test_configure_plugin_keeps_settings_on_error(), test_configure_plugin_returns_changed_copy()

## Knowledge Gaps
- **3 isolated node(s):** `npx`, `@upstash/context7-mcp`, `mediavault`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 621 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **64 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MediaDatabase` connect `MediaItem` to `test_remote.py`, `import_paths`, `test_plugin_import.py`, `plugin_import.py`, `DownloadsPage`, `library.py`, `os`, `FolderSync`, `load_configs`, `.__init__`, `main_window.py`, `ConfigDialog`, `GroupPickDialog`, `DetailDialog`, `MainWindow`, `EditDialog`, `test_library.py`, `absolute_path`, `test_volumes.py`, `PluginImport`, `MediaItem`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `MediaDatabase` (e.g. with `AnalysisDialog` and `DetailDialog`) actually correct?**
  _`MediaDatabase` has 20 INFERRED edges - model-reasoned connections that need verification._
- **What connects `npx`, `@upstash/context7-mcp`, `mediavault` to the rest of the system?**
  _3 weakly-connected nodes found - possible missing edges._
- **Should `test_remote.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0547945205479452 - nodes in this community are weakly interconnected._
- **Why does `CardGrid` connect `CardGrid` to `RubberBandSelector`, `plugin_import.py`, `._finish_batch`, `MainWindow`, `.entries`, `test_card_grid.py`, `.eventFilter`, `.closeEvent`, `main_window.py`, `.escape`, `.cancel_drag`, `.__init__`, `.clear_selection`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `MediaItem` (e.g. with `_ai_entry()` and `test_summarize_prompts_counts_tags_models_and_scores()`) actually correct?**
  _`MediaItem` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Should `import_paths` be split into smaller, more focused modules?**
  _Cohesion score 0.11605937921727395 - nodes in this community are weakly interconnected._