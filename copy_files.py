import os
import shutil

def copy_html_to_var_www():
    # Define source and destination directories
    source_dir = os.path.join(os.getcwd(), 'html')
    dest_dir = '/var/www/iamcalledned.ai/'

    # Ensure the destination directory exists
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir)

    # Loop through all files in the source directory
    for item in os.listdir(source_dir):
        source_path = os.path.join(source_dir, item)
        dest_path = os.path.join(dest_dir, item)

        # Copy the file
        if os.path.isfile(source_path):
            shutil.copy2(source_path, dest_path)
            print(f"Copied {source_path} to {dest_path}")
        elif os.path.isdir(source_path):
            if not os.path.exists(dest_path):
                shutil.copytree(source_path, dest_path)
                print(f"Copied directory {source_path} to {dest_path}")
            else:
                for sub_item in os.listdir(source_path):
                    sub_source_path = os.path.join(source_path, sub_item)
                    sub_dest_path = os.path.join(dest_path, sub_item)
                    if os.path.isfile(sub_source_path):
                        shutil.copy2(sub_source_path, sub_dest_path)
                        print(f"Copied {sub_source_path} to {sub_dest_path}")
                    elif os.path.isdir(sub_source_path):
                        shutil.copytree(sub_source_path, sub_dest_path)
                        print(f"Copied directory {sub_source_path} to {sub_dest_path}")

if __name__ == "__main__":
    copy_html_to_var_www()
