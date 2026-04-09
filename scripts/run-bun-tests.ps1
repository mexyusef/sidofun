param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$testFiles = Get-ChildItem -Path (Join-Path $RepoRoot "tests") -Filter *.test.ts -File |
    Sort-Object Name |
    ForEach-Object { $_.FullName }

if (-not $testFiles -or $testFiles.Count -eq 0) {
    throw "No Bun test files found under $RepoRoot\tests"
}

Push-Location $RepoRoot
try {
    & bun test @testFiles
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
