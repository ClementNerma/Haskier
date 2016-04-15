<?php

function recurse($dir) {
  $out     = array();
  $handler = opendir($dir);

  while(($file = readdir($handler)) !== FALSE) {
    if($file !== '.' && $file !== '..') {
      if(is_dir($dir . '/' . $file))
        $out[$file] = recurse($dir . '/' . $file);
      else
        $out[$file] = file_get_contents($dir . '/' . $file);
    }
  }

  closedir($handler);

  return $out;
}

die(json_encode(recurse('../../game'), JSON_FORCE_OBJECT));
