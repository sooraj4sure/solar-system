class SolarSystem {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.isAnimating = true;
    this.isDarkTheme = true;

    // Planet data with realistic relative sizes and distances
    this.planetData = [
      {
        name: "Mercury",
        radius: 0.8,
        distance: 8,
        speed: 4.74,
        color: 0x8c7853,
      },
      { name: "Venus", radius: 1.2, distance: 11, speed: 3.5, color: 0xffc649 },
      {
        name: "Earth",
        radius: 1.3,
        distance: 15,
        speed: 2.98,
        color: 0x6b93d6,
      },
      { name: "Mars", radius: 1.0, distance: 20, speed: 2.41, color: 0xc1440e },
      {
        name: "Jupiter",
        radius: 3.5,
        distance: 28,
        speed: 1.31,
        color: 0xd8ca9d,
      },
      {
        name: "Saturn",
        radius: 3.0,
        distance: 38,
        speed: 0.97,
        color: 0xfad5a5,
      },
      {
        name: "Uranus",
        radius: 2.0,
        distance: 48,
        speed: 0.68,
        color: 0x4fd0e7,
      },
      {
        name: "Neptune",
        radius: 1.9,
        distance: 58,
        speed: 0.54,
        color: 0x4b70dd,
      },
    ];

    this.planets = [];
    this.planetMeshes = [];
    this.sun = null;
    this.stars = [];
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.hoveredPlanet = null;

    this.init();
  }

  init() {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLights();
    this.createSun();
    this.createPlanets();
    this.createStars();
    this.createControls();
    this.setupEventListeners();
    this.animate();

    // Hide loading screen
    setTimeout(() => {
      document.getElementById("loading-screen").style.opacity = "0";
      setTimeout(() => {
        document.getElementById("loading-screen").style.display = "none";
      }, 500);
    }, 1000);
  }

  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000511);
  }

  createCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 30, 80);
    this.camera.lookAt(0, 0, 0);
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("three-canvas"),
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  createLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.1);
    this.scene.add(ambientLight);

    // Point light from sun
    const sunLight = new THREE.PointLight(0xffffff, 2, 0);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    this.scene.add(sunLight);
  }

  createSun() {
    const sunGeometry = new THREE.SphereGeometry(4, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.3,
    });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sun);
  }

  createPlanets() {
    this.planetData.forEach((planetInfo, index) => {
      // Create planet geometry and material
      const geometry = new THREE.SphereGeometry(planetInfo.radius, 32, 32);
      const material = new THREE.MeshLambertMaterial({
        color: planetInfo.color,
      });
      const planet = new THREE.Mesh(geometry, material);

      // Create orbit container
      const orbitContainer = new THREE.Object3D();
      orbitContainer.add(planet);
      planet.position.x = planetInfo.distance;

      // Enable shadows
      planet.castShadow = true;
      planet.receiveShadow = true;

      // Store references
      planet.userData = {
        name: planetInfo.name,
        originalSpeed: planetInfo.speed,
        currentSpeed: planetInfo.speed,
        distance: planetInfo.distance,
        radius: planetInfo.radius,
      };

      this.planets.push(orbitContainer);
      this.planetMeshes.push(planet);
      this.scene.add(orbitContainer);

      // Create orbit path
      this.createOrbitPath(planetInfo.distance);
    });

    this.createControlPanel();
  }

  createOrbitPath(distance) {
    const points = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        )
      );
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.3,
    });
    const orbit = new THREE.Line(geometry, material);
    this.scene.add(orbit);
  }

  createStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
    });

    const starVertices = [];
    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 400;
      const y = (Math.random() - 0.5) * 400;
      const z = (Math.random() - 0.5) * 400;
      starVertices.push(x, y, z);
    }

    starGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starVertices, 3)
    );
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
  }

  createControlPanel() {
    const controlsContainer = document.getElementById("planet-controls");

    this.planetData.forEach((planetInfo, index) => {
      const controlGroup = document.createElement("div");
      controlGroup.className = "control-group";

      const label = document.createElement("div");
      label.className = "planet-label";
      label.innerHTML = `
                        <span class="planet-color" style="background-color: #${planetInfo.color
                          .toString(16)
                          .padStart(6, "0")}"></span>
                        ${planetInfo.name}
                    `;

      const speedControl = document.createElement("div");
      speedControl.className = "speed-control";

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "10";
      slider.step = "0.1";
      slider.value = planetInfo.speed;
      slider.className = "speed-slider";

      const valueDisplay = document.createElement("span");
      valueDisplay.className = "speed-value";
      valueDisplay.textContent = planetInfo.speed.toFixed(1);

      slider.addEventListener("input", (e) => {
        const newSpeed = parseFloat(e.target.value);
        this.planetMeshes[index].userData.currentSpeed = newSpeed;
        valueDisplay.textContent = newSpeed.toFixed(1);
      });

      speedControl.appendChild(slider);
      speedControl.appendChild(valueDisplay);

      controlGroup.appendChild(label);
      controlGroup.appendChild(speedControl);
      controlsContainer.appendChild(controlGroup);
    });

    // Setup collapsible sections
    this.setupCollapsibleSections();
  }

  setupCollapsibleSections() {
    const sectionHeaders = document.querySelectorAll(".section-header");

    sectionHeaders.forEach((header) => {
      header.addEventListener("click", () => {
        const sectionName = header.getAttribute("data-section");
        const content = document.getElementById(sectionName + "-content");
        const toggle = header.querySelector(".section-toggle");

        content.classList.toggle("collapsed");
        toggle.classList.toggle("collapsed");
      });
    });
  }

  createControls() {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    // Mouse controls for camera rotation
    document.addEventListener("mousedown", (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        const deltaMove = {
          x: e.clientX - previousMousePosition.x,
          y: e.clientY - previousMousePosition.y,
        };

        const deltaRotationQuaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(deltaMove.y * 0.01, deltaMove.x * 0.01, 0, "XYZ")
        );

        this.camera.position.applyQuaternion(deltaRotationQuaternion);
        this.camera.lookAt(this.scene.position);

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }

      // Update mouse position for raycasting
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // Zoom controls
    document.addEventListener("wheel", (e) => {
      const zoomSpeed = 0.1;
      const direction = this.camera.position.clone().normalize();

      if (e.deltaY > 0) {
        this.camera.position.add(direction.multiplyScalar(zoomSpeed * 5));
      } else {
        this.camera.position.sub(direction.multiplyScalar(zoomSpeed * 5));
      }
    });
  }

  setupEventListeners() {
    // Hamburger menu toggle
    const hamburgerMenu = document.getElementById("hamburger-menu");
    const controlPanel = document.getElementById("control-panel");

    hamburgerMenu.addEventListener("click", () => {
      hamburgerMenu.classList.toggle("active");
      controlPanel.classList.toggle("active");
    });

    // Info toggle for mobile
    const infoToggle = document.getElementById("info-toggle");
    const infoPanel = document.getElementById("info-panel");

    infoToggle.addEventListener("click", () => {
      infoPanel.classList.toggle("active");
    });

    // Close panels when clicking outside (mobile)
    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        if (
          !controlPanel.contains(e.target) &&
          !hamburgerMenu.contains(e.target)
        ) {
          controlPanel.classList.remove("active");
          hamburgerMenu.classList.remove("active");
        }
        if (!infoPanel.contains(e.target) && !infoToggle.contains(e.target)) {
          infoPanel.classList.remove("active");
        }
      }
    });

    // Pause/Resume button
    document.getElementById("pause-btn").addEventListener("click", () => {
      this.isAnimating = !this.isAnimating;
      document.getElementById("pause-btn").textContent = this.isAnimating
        ? "Pause"
        : "Resume";
    });

    // Reset button
    document.getElementById("reset-btn").addEventListener("click", () => {
      this.resetPlanets();
    });

    // Theme toggle
    document.getElementById("theme-btn").addEventListener("click", () => {
      this.toggleTheme();
    });

    // Window resize
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      // Close mobile panels on resize to desktop
      if (window.innerWidth > 768) {
        controlPanel.classList.remove("active");
        hamburgerMenu.classList.remove("active");
        infoPanel.classList.remove("active");
      }
    });

    // Mouse move for tooltips
    document.addEventListener("mousemove", (e) => {
      this.handleTooltips(e);
    });
  }

  handleTooltips(event) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.planetMeshes);

    const tooltip = document.getElementById("tooltip");

    if (intersects.length > 0) {
      const planet = intersects[0].object;
      if (planet !== this.hoveredPlanet) {
        this.hoveredPlanet = planet;
        tooltip.innerHTML = `
                            <strong>${planet.userData.name}</strong><br>
                            Distance: ${planet.userData.distance} AU<br>
                            Speed: ${planet.userData.currentSpeed.toFixed(
                              1
                            )}x<br>
                            Radius: ${planet.userData.radius} units
                        `;
        tooltip.style.display = "block";
      }
      tooltip.style.left = event.clientX + 10 + "px";
      tooltip.style.top = event.clientY - 10 + "px";
    } else {
      tooltip.style.display = "none";
      this.hoveredPlanet = null;
    }
  }

  resetPlanets() {
    this.planets.forEach((planet, index) => {
      planet.rotation.y = 0;
      this.planetMeshes[index].userData.currentSpeed =
        this.planetData[index].speed;

      // Reset sliders
      const sliders = document.querySelectorAll(".speed-slider");
      const valueDisplays = document.querySelectorAll(".speed-value");
      sliders[index].value = this.planetData[index].speed;
      valueDisplays[index].textContent =
        this.planetData[index].speed.toFixed(1);
    });
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    document.body.classList.toggle("light-theme");
    document.getElementById("theme-btn").textContent = this.isDarkTheme
      ? "Light Mode"
      : "Dark Mode";

    if (this.isDarkTheme) {
      this.scene.background = new THREE.Color(0x000511);
    } else {
      this.scene.background = new THREE.Color(0x87ceeb);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.isAnimating) {
      const delta = this.clock.getDelta();

      // Rotate sun
      this.sun.rotation.y += delta * 0.5;

      // Animate planets
      this.planets.forEach((planet, index) => {
        const speed = this.planetMeshes[index].userData.currentSpeed;
        planet.rotation.y += delta * speed * 0.1;

        // Rotate planet on its axis
        this.planetMeshes[index].rotation.y += delta * 2;
      });

      // Slowly rotate stars
      this.stars.rotation.y += delta * 0.02;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the solar system when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new SolarSystem();
});
