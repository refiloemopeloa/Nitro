# GitHub Branch Workflow

## main

* Working version of application.
* Hosted on lamp server.
## develop

* Branched from `main`.
* Actively being worked on.
* When version is tested and approved, merge with `main`.

## feature

* Branched from `develop`
* Different features in development
	* Lighting
	* Physics
	* Models
	* etc.
* Contains many features across different branches.
* Each person works on their branch.
* When feature is tested and pull request is approved, merge with develop.
* Delete `feature` branch when completed.