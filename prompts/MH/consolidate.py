import glob
import os
import pandas as pd


def merge_csv_varying_columns(folder_path, output_file):
    # Find all CSV files in the folder
    csv_files = glob.glob(os.path.join(folder_path, "*.csv"))

    if not csv_files:
        print("No CSV files found.")
        return

    df_list = []
    for file in csv_files:
        # Avoid reading the output file if it already exists in the same folder
        if os.path.basename(file) == os.path.basename(output_file):
            continue

        try:
            # on_bad_lines='skip' prevents crashes if individual rows are corrupted
            df = pd.read_csv(file, on_bad_lines="skip")
            df_list.append(df)
            print(
                f"Loaded '{os.path.basename(file)}' ({len(df.columns)} columns)"
            )
        except Exception as e:
            print(f"Skipped '{os.path.basename(file)}' due to error: {e}")

    if not df_list:
        print("No readable CSV files found.")
        return

    # pd.concat performs an outer join on column names by default.
    # It builds a master set of all unique columns found across all files.
    consolidated_df = pd.concat(df_list, ignore_index=True, sort=False)

    # Save to a single output CSV
    consolidated_df.to_csv(output_file, index=False)

    print(f"\n--- Merge Complete ---")
    print(f"Merged {len(df_list)} files into '{output_file}'")
    print(
        f"Master dataset contains {len(consolidated_df.columns)} total unique columns."
    )


# Set your directory and output file name
target_folder = "./"  # Use '.' for current directory or specify full path
output_csv_name = "consolidated_output.csv"

merge_csv_varying_columns(target_folder, output_csv_name)