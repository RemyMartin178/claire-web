!macro customInstall
  ; Copie de l'icone directement dans le repertoire d'installation pour avoir une source saine
  CopyFiles "${BUILD_RESOURCES_DIR}\icon.ico" "$INSTDIR\icon.ico"

  ; Recreation du raccourci sur le Bureau en forcant l'icone a pointer sur cette copie
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}.exe" "" "$INSTDIR\icon.ico"
!macroend
